import { test, expect } from '@playwright/test'
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const bash = process.env.BASH_BINARY || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash')

// Run the actual deployment script with shell functions standing in for Docker,
// health probes and delays. No real containers, network or deployment are used.
for (const scenario of ['build-failure', 'startup-failure', 'health-failure', 'success', 'legacy-build-failure']) {
  test(`deployment ${scenario} ${scenario === 'success' ? 'keeps the new image' : 'keeps or restores the old service'}`, () => {
    test.skip(!existsSync(bash), 'Bash is required to exercise the deployment script')
    const directory = mkdtempSync(path.join(tmpdir(), 'yang-deploy-test-'))
    try {
      writeFileSync(path.join(directory, 'service'), 'old')
      const mock = path.join(directory, 'mock.sh')
      writeFileSync(mock, `
docker() {
  printf '%s\\n' "$*" >> "$DEPLOY_TEST_DIR/calls"
  if [ "$1" = inspect ]; then
    if [ "$2" = ganglegang ]; then
      if [ "$4" = '{{.Image}}' ]; then printf 'sha256:previous\\n'; else printf 'true\\n'; fi
    elif [[ "$4" == *NetworkSettings* ]]; then printf 'caddy-test-network\\n'; fi
    return 0
  fi
  if [ "$1" = rm ]; then printf removed > "$DEPLOY_TEST_DIR/service"; return 0; fi
  if [ "$1" = network ]; then return 0; fi
  if [ "$1" != compose ]; then return 1; fi
  shift
  case "$1" in
    version) [ "$DEPLOY_TEST_SCENARIO" != legacy-build-failure ]; return $? ;;
    build) [[ "$DEPLOY_TEST_SCENARIO" != *build-failure ]]; return $? ;;
    up)
      if [ "$DEPLOY_TEST_SCENARIO" = startup-failure ]; then return 1; fi
      printf new > "$DEPLOY_TEST_DIR/service" ;;
    -f)
      if ! grep -q 'image: "sha256:previous"' "$4"; then return 1; fi
      printf old > "$DEPLOY_TEST_DIR/service" ;;
    logs) return 0 ;;
    *) return 1 ;;
  esac
}
docker-compose() { docker compose "$@"; }
curl() { if [ "$DEPLOY_TEST_SCENARIO" = health-failure ]; then return 22; fi; printf 200; }
sleep() { :; }
`)
      const result = spawnSync(bash, [path.resolve('deploy/deploy-update.sh').replace(/\\/g, '/')], {
        cwd: directory, encoding: 'utf8', timeout: 10000, windowsHide: true,
        env: { ...process.env, BASH_ENV: mock.replace(/\\/g, '/'), DEPLOY_TEST_DIR: directory.replace(/\\/g, '/'), DEPLOY_TEST_SCENARIO: scenario }
      })
      expect(result.error).toBeUndefined()
      expect(result.status, result.stdout + result.stderr).toBe(scenario === 'success' ? 0 : 1)
      expect(readFileSync(path.join(directory, 'service'), 'utf8')).toBe(scenario === 'success' ? 'new' : 'old')
      const calls = readFileSync(path.join(directory, 'calls'), 'utf8')
      if (scenario.includes('build-failure')) {
        expect(calls).not.toContain('rm -f')
        expect(calls).not.toContain(' up ')
      } else {
        expect(calls.indexOf('compose build')).toBeLessThan(calls.indexOf('rm -f'))
        if (scenario !== 'success') {
          expect(calls).toContain('compose -f compose.yaml -f ')
          expect(calls).toContain('network connect --alias ganglegang caddy-test-network ganglegang')
        }
      }
    } finally {
      if (path.dirname(directory) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('yang-deploy-test-')) throw new Error('Unexpected deployment test directory')
      rmSync(directory, { recursive: true, force: true })
    }
  })
}
