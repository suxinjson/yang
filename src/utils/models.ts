import * as T from 'three'

export type ModelOptions = { gender?: string; skin?: string; hairColor?: string; eyeColor?: string; lipColor?: string; pose?: string; equippedSlots?: Record<string, string | null> }
let renderer: T.WebGLRenderer | undefined
const images = new Map<string, string>()
const material = (color: string, metalness = 0, roughness = .65) => new T.MeshStandardMaterial({ color, metalness, roughness })

/** One shared offscreen renderer; rooms and catalogues display cached images, not dozens of WebGL contexts. */
export function modelImage(id: string, options: ModelOptions = {}): string {
  const key = JSON.stringify([id, options])
  if (images.has(key)) return images.get(key)!
  renderer ||= new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(320, 360)
  renderer.setPixelRatio(1)
  renderer.setClearColor(0, 0)
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.35
  const scene = new T.Scene(), group = new T.Group()
  scene.add(group, new T.HemisphereLight('#fff5e9', '#716d63', 3))
  const light = new T.DirectionalLight('#fff4de', 4); light.position.set(-3, 6, 5); scene.add(light)
  const fill = new T.DirectionalLight('#dce8f2', 2); fill.position.set(4, 3, -2); scene.add(fill)
  const oak = material('#937456'), walnut = material('#46372c'), linen = material('#ded7c7'), cream = material('#efe9dc'), brass = material('#b59b65', .65, .3), dark = material('#283330'), sage = material('#77806c')
  function mesh(geometry: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number) {
    const item = new T.Mesh(geometry, mat); item.position.set(x, y, z); group.add(item); return item
  }
  function box(w: number, h: number, d: number, mat: T.Material, x = 0, y = 0, z = 0, radius = .06) {
    // Bevelled extrusions catch studio light along each edge.
    const r = Math.min(radius, w / 3, h / 3, d / 3), s = new T.Shape()
    s.moveTo(-w/2+r,-h/2); s.lineTo(w/2-r,-h/2); s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r)
    s.lineTo(w/2,h/2-r); s.quadraticCurveTo(w/2,h/2,w/2-r,h/2); s.lineTo(-w/2+r,h/2)
    s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r); s.lineTo(-w/2,-h/2+r); s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2)
    const geo = new T.ExtrudeGeometry(s, { depth: d-2*r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, steps: 1 }); geo.translate(0,0,-(d-2*r)/2)
    return mesh(geo,mat,x,y,z)
  }
  function ball(rx: number, ry: number, rz: number, mat: T.Material, x: number, y: number, z: number) {
    const m = mesh(new T.SphereGeometry(1,24,18),mat,x,y,z); m.scale.set(rx,ry,rz); return m
  }
  function rod(radius: number, h: number, mat: T.Material, x: number, y: number, z: number) { return mesh(new T.CylinderGeometry(radius,radius,h,20),mat,x,y,z) }
  function legs(w: number, d: number, h = .35) { for (const x of [-w,w]) for (const z of [-d,d]) rod(.035,h,walnut,x,h/2,z) }
  const character = id === 'character' || id.startsWith('wardrobe.')
  if (character) {
    const slots = { ...options.equippedSlots }
    if (id.startsWith('wardrobe.')) slots[id.split('.')[1]!] = id
    const male = options.gender === 'male' || options.gender === 'boy', sitting = options.pose === 'sitting'
    const skin = material(options.skin || '#d9ad8e'), hair = material(options.hairColor || '#302923'), eyes = material(options.eyeColor || '#3b3631'), lips = material(options.lipColor || '#aa7068')
    const coat = material(slots.top?.includes('pink') ? '#b58c85' : slots.top?.includes('suit') ? '#444e49' : '#d6cebd')
    const pants = material(slots.bottom?.includes('denim') ? '#586a77' : '#5a5751')
    const hip = sitting ? .91 : 1.16, head = hip + 1.03
    ball(male?.28:.23,.4,.15,coat,0,hip+.45,0)
    rod(.075,.16,skin,0,hip+.86,0)
    ball(.19,.265,.19,skin,0,head,0)
    ball(.199,.16,.201,hair,0,head+.145,-.016)
    if (slots.hair?.includes('wavy') || (!male && !slots.hair?.includes('short'))) {
      for (const x of [-.17,.17]) ball(.083,.39,.125,hair,x,head-.06,-.09)
    }
    if (slots.hair?.includes('ponytail')) ball(.12,.3,.12,hair,.15,head+.06,-.23)
    for (const x of [-.072,.072]) {
      ball(.032,.014,.014,eyes,x,head+.018,.181)
      box(.066,.009,.009,hair,x,head+.061,.18,.003)
      ball(.008,.007,.008,cream,x-.007,head+.022,.193)
    }
    ball(.023,.04,.028,skin,0,head-.026,.188)
    ball(.045,.009,.012,lips,0,head-.098,.176)
    for (const side of [-1,1]) {
      const arm = ball(.085,.31,.09,coat,side*(male?.31:.265),hip+.42,0); arm.rotation.z = side*.1
      ball(.064,.09,.06,skin,side*(male?.34:.295),hip+.06,.015)
      if (sitting) { box(.16,.18,.49,pants,side*.12,hip-.06,.22); rod(.074,.58,pants,side*.12,hip-.42,.43); box(.18,.1,.31,dark,side*.12,.19,.51) }
      else { rod(.085,.94,pants,side*.115,.64,0); box(.19,.11,.34,dark,side*.115,.12,.07) }
    }
    if (slots.bottom?.includes('skirt')) mesh(new T.CylinderGeometry(.23,.34,.45,24),material('#777165'),0,hip-.16,0)
    if (slots.accessory?.includes('glasses')) {
      for (const x of [-.073,.073]) { const ring = mesh(new T.TorusGeometry(.051,.004,6,24),brass,x,head+.017,.2); ring.scale.y=.72 }
      box(.045,.005,.005,brass,0,head+.018,.2,.001)
    }
  } else if (id.includes('sofa')) {
    legs(.76,.3,.27); box(1.8,.25,.82,linen,0,.4,0); box(1.8,.65,.22,linen,0,.83,-.3)
    for (const x of [-.83,.83]) box(.22,.47,.85,cream,x,.64,0)
    for (const x of [-.39,.39]) box(.72,.16,.67,cream,x,.6,.06)
    box(.33,.34,.12,sage,-.56,.84,-.11).rotation.z=-.16
    box(.34,.35,.12,material('#b49b81'),.55,.85,-.11).rotation.z=.13
  } else if (id.includes('desk')) {
    legs(.67,.3,.9); box(1.55,.09,.8,oak,0,.94,0); box(.6,.45,.055,dark,0,1.29,-.14)
    box(.55,.36,.015,material('#8baba6',.25,.25),0,1.31,-.1); rod(.025,.2,brass,0,1,-.14)
    box(.43,.025,.16,cream,0,1,.15); rod(.06,.15,cream,.57,1.055,.14)
  } else if (id.includes('tv')) {
    legs(.65,.22,.23); box(1.5,.4,.52,walnut,0,.44,0)
    for (const x of [-.49,0,.49]) box(.45,.31,.02,oak,x,.44,.275)
    box(1.27,.77,.06,dark,0,1.11,-.05); box(1.18,.67,.012,material('#445e5c',.25,.2),0,1.11,-.008)
    ball(.31,.22,.005,material('#9ba997'),.22,1.1,.002); rod(.035,.17,dark,0,.71,-.05)
  } else if (id.includes('bed') && !id.includes('pet')) {
    legs(.65,.86,.2); box(1.5,.28,2,oak,0,.3,0); box(1.45,.2,1.9,cream,0,.53,.02); box(1.54,.85,.12,linen,0,.7,-.94)
    box(1.46,.1,1.2,sage,0,.67,.37); for(const x of [-.37,.37]) box(.57,.14,.38,cream,x,.68,-.61)
  } else if (id.includes('pet.bed')) {
    ball(.57,.16,.44,oak,0,.2,0); ball(.49,.12,.37,linen,0,.3,.01)
    rod(.047,.95,oak,.63,.49,-.22); box(.4,.06,.36,cream,.63,.98,-.22)
  } else if (id.includes('plant')) {
    mesh(new T.CylinderGeometry(.22,.15,.4,32),cream,0,.22,0)
    for(let n=0;n<8;n++) { const a=n*2.4, y=.55+n*.075; const leaf=ball(.21,.08,.1,sage,Math.sin(a)*.25,y,Math.cos(a)*.18); leaf.rotation.z=Math.sin(a)*.6; rod(.012,y-.4,walnut,0,(y+.4)/2,0) }
  } else if (id.includes('mirror')) {
    box(.8,1.55,.07,brass,0,.85,0,.2); box(.73,1.47,.08,material('#bac9c4',.8,.15),0,.85,.015,.18)
    box(.8,.055,.35,oak,0,.09,.1)
  } else if (id.includes('frame')) {
    box(.9,1.14,.08,oak,0,.7,0); box(.77,1,.09,cream,0,.7,.008)
    box(.63,.84,.015,sage,0,.7,.06); ball(.2,.29,.01,material('#c2b399'),-.13,.72,.075); ball(.18,.36,.01,walnut,.14,.61,.075)
  } else if (id.includes('rug')) {
    const rug=mesh(new T.CylinderGeometry(.85,.85,.025,64),linen,0,.03,0); rug.scale.z=.68
    for (let i=0;i<4;i++) { const ring=mesh(new T.TorusGeometry(.64+i*.045,.006,4,64),oak,0,.05,0); ring.rotation.x=Math.PI/2; ring.scale.y=.68 }
  } else {
    // Supplies use a physical tin; unknown furniture uses a sculptural side table.
    if (id.includes('supply') || id.includes('token') || id.startsWith('gang.')) { rod(.28,.62,sage,0,.34,0); rod(.29,.025,brass,0,.66,0); box(.38,.22,.025,cream,0,.35,.27) }
    else { rod(.13,.6,walnut,0,.3,0); const top=rod(.58,.07,oak,0,.65,0); top.scale.z=.8 }
  }
  const bounds = new T.Box3().setFromObject(group), center = bounds.getCenter(new T.Vector3()), size = bounds.getSize(new T.Vector3())
  group.position.sub(center)
  const camera = new T.OrthographicCamera(-1,1,1,-1,.01,50)
  const extent = Math.max(size.y, size.x*1.125, size.z*1.125)*.72
  camera.left=-extent*320/360; camera.right=extent*320/360; camera.top=extent; camera.bottom=-extent
  camera.position.set(character?1.2:3,character?1:2.5,6); camera.lookAt(0,0,0); camera.updateProjectionMatrix()
  renderer.render(scene,camera)
  const result=renderer.domElement.toDataURL('image/png')
  group.traverse(object=> { if(object instanceof T.Mesh) object.geometry.dispose() })
  const mats=new Set<T.Material>(); scene.traverse(object=> { if(object instanceof T.Mesh) for(const m of [object.material].flat()) mats.add(m) }); mats.forEach(m=>m.dispose())
  if(images.size>=160) images.delete(images.keys().next().value!)
  images.set(key,result); return result
}
