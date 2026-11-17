package com.love.ganglegang;

import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
  private File apk; private volatile int progress = 0; private volatile String error = "";
  @PluginMethod public void download(PluginCall call) {
    String url=call.getString("url"), sha=call.getString("sha256"); int size=call.getInt("size",0);
    if(url==null||!url.startsWith("https://")||sha==null||size<=0){call.reject("更新信息无效");return;}
    new Thread(() -> { try {
      HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection(); c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setInstanceFollowRedirects(false);
      if(c.getResponseCode()!=200) throw new IOException("下载服务返回 "+c.getResponseCode());
      File dir=new File(getContext().getCacheDir(),"updates"); if(!dir.exists()&&!dir.mkdirs())throw new IOException("无法创建更新缓存");
      File tmp=new File(dir,"update.apk.part"), out=new File(dir,"update.apk");
      try(InputStream in=new BufferedInputStream(c.getInputStream()); OutputStream os=new BufferedOutputStream(new FileOutputStream(tmp))){byte[] b=new byte[16384];int n,total=0;while((n=in.read(b))>=0){total+=n;if(total>size)throw new IOException("更新包大小异常");os.write(b,0,n);progress=Math.min(99,total*100/size);}}
      if(tmp.length()!=size)throw new IOException("更新包不完整"); MessageDigest md=MessageDigest.getInstance("SHA-256"); try(InputStream in=new FileInputStream(tmp)){byte[] b=new byte[16384];int n;while((n=in.read(b))>=0)md.update(b,0,n);} StringBuilder hex=new StringBuilder();for(byte x:md.digest())hex.append(String.format("%02x",x)); if(!hex.toString().equalsIgnoreCase(sha))throw new IOException("更新包校验失败"); if(out.exists())out.delete();if(!tmp.renameTo(out))throw new IOException("无法保存更新包"); apk=out;progress=100;call.resolve();
    }catch(Exception e){error=e.getMessage()==null?"下载失败":e.getMessage();call.reject(error);} }).start();
  }
  @PluginMethod public void status(PluginCall call){JSObject o=new JSObject();o.put("ready",apk!=null&&apk.exists());o.put("progress",progress);o.put("error",error);call.resolve(o);}
  @PluginMethod public void install(PluginCall call){if(apk==null||!apk.exists()){call.reject("请先下载更新");return;}Uri uri=FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",apk);Intent i=new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_ACTIVITY_NEW_TASK);getContext().startActivity(i);call.resolve();}
}
