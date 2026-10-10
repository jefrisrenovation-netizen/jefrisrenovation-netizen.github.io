import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const platform=process.argv[2];
if(!['ios','android'].includes(platform))throw new Error('Expected ios or android');
const bundle='io.github.jefrisrenovation-netizen.suividesheures';
if(!fs.existsSync(platform))execFileSync('npx',['cap','add',platform],{stdio:'inherit'});
execFileSync('npx',['cap','sync',platform],{stdio:'inherit'});
if(fs.existsSync(`${platform}/.suivi-prepared`)){console.log('Native project already prepared');process.exit(0)}
if(platform==='ios'){
  let pbx=fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj','utf8');
  pbx=pbx.replaceAll('PRODUCT_BUNDLE_IDENTIFIER = io.github.jefrisrenovation.suividesheures;',`PRODUCT_BUNDLE_IDENTIFIER = "${bundle}";`);
  pbx=pbx.replaceAll('CODE_SIGN_STYLE = Automatic;','CODE_SIGN_STYLE = Automatic;\n\t\t\t\tDEVELOPMENT_TEAM = ZFF7B3HXTT;\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;');
  pbx=pbx.replaceAll('DEVELOPMENT_TEAM = "";','DEVELOPMENT_TEAM = ZFF7B3HXTT;');
  // Add the app privacy manifest to the generated Xcode project.
  pbx=pbx.replace('/* Begin PBXBuildFile section */','/* Begin PBXBuildFile section */\n\t\tA00000000000000000000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = A00000000000000000000002 /* PrivacyInfo.xcprivacy */; };');
  pbx=pbx.replace('/* Begin PBXFileReference section */','/* Begin PBXFileReference section */\n\t\tA00000000000000000000002 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };');
  pbx=pbx.replace('504EC30E1FED79650016851F /* Assets.xcassets */,','504EC30E1FED79650016851F /* Assets.xcassets */,\n\t\t\t\tA00000000000000000000002 /* PrivacyInfo.xcprivacy */,');
  pbx=pbx.replace('504EC30F1FED79650016851F /* Assets.xcassets in Resources */,','504EC30F1FED79650016851F /* Assets.xcassets in Resources */,\n\t\t\t\tA00000000000000000000001 /* PrivacyInfo.xcprivacy in Resources */,');
  fs.writeFileSync('ios/App/App.xcodeproj/project.pbxproj',pbx);
  fs.copyFileSync('native/PrivacyInfo.xcprivacy','ios/App/App/PrivacyInfo.xcprivacy');
  fs.copyFileSync('native/App.entitlements','ios/App/App/App.entitlements');
  fs.copyFileSync('native/icon-1024.png','ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
  let plist=fs.readFileSync('ios/App/App/Info.plist','utf8');
  plist=plist.replace('</dict>\n</plist>','<key>ITSAppUsesNonExemptEncryption</key><false/>\n<key>CFBundleURLTypes</key><array><dict><key>CFBundleURLSchemes</key><array><string>suiviheurespro</string></array></dict></array>\n</dict>\n</plist>');
  fs.writeFileSync('ios/App/App/Info.plist',plist);
}else{
  let manifest=fs.readFileSync('android/app/src/main/AndroidManifest.xml','utf8');
  manifest=manifest.replace('</activity>','<intent-filter android:autoVerify="true"><action android:name="android.intent.action.VIEW"/><category android:name="android.intent.category.DEFAULT"/><category android:name="android.intent.category.BROWSABLE"/><data android:scheme="https" android:host="jefrisrenovation-netizen.github.io" android:path="/"/></intent-filter>\n<intent-filter><action android:name="android.intent.action.VIEW"/><category android:name="android.intent.category.DEFAULT"/><category android:name="android.intent.category.BROWSABLE"/><data android:scheme="suiviheurespro" android:host="login"/></intent-filter>\n</activity>');
  fs.writeFileSync('android/app/src/main/AndroidManifest.xml',manifest);
  for(const size of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']){
    const folder=`android/app/src/main/res/mipmap-${size}`;
    for(const name of ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png'])fs.copyFileSync(`native/android-${size}.png`,`${folder}/${name}`);
  }
  fs.writeFileSync('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml','<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@android:color/white"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>');
  fs.writeFileSync('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',fs.readFileSync('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml'));
  const version=Number(process.env.BUILD_NUMBER||1);
  let gradle=fs.readFileSync('android/app/build.gradle','utf8').replace(/versionCode\s+\d+/g,`versionCode ${version}`);
  fs.writeFileSync('android/app/build.gradle',gradle);
}
console.log(`Prepared ${platform} project`);

fs.writeFileSync(`${platform}/.suivi-prepared`,'1');
