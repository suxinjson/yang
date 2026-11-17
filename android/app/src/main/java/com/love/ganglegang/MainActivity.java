package com.love.ganglegang;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(android.os.Bundle state) { super.onCreate(state); registerPlugin(AppUpdaterPlugin.class); }
}
