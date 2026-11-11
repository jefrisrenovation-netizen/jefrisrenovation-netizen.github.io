import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const platform=process.argv[2];
if(!['ios','android'].includes(platform))throw new Error('Expected ios or android');
const bundle='io.github.jefrisrenovation-netizen.suividesheures';
const appVersion=JSON.parse(fs.readFileSync('package.json','utf8')).version;
if(!/^\d+\.\d+\.\d+$/.test(appVersion))throw new Error('Invalid application version');
if(!fs.existsSync(platform))execFileSync('npx',['cap','add',platform],{stdio:'inherit'});
execFileSync('npx',['cap','sync',platform],{stdio:'inherit'});
if(fs.existsSync(`${platform}/.suivi-prepared`)){console.log('Native project already prepared');process.exit(0)}
if(platform==='ios'){
  let pbx=fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj','utf8');
  pbx=pbx.replaceAll('PRODUCT_BUNDLE_IDENTIFIER = io.github.jefrisrenovation.suividesheures;',`PRODUCT_BUNDLE_IDENTIFIER = "${bundle}";`);
  pbx=pbx.replaceAll('CODE_SIGN_STYLE = Automatic;','CODE_SIGN_STYLE = Automatic;\n\t\t\t\tDEVELOPMENT_TEAM = ZFF7B3HXTT;\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;');
  pbx=pbx.replaceAll('DEVELOPMENT_TEAM = "";','DEVELOPMENT_TEAM = ZFF7B3HXTT;');
  // Use the release version from the package manifest for App Store updates.
  pbx=pbx.replace(/MARKETING_VERSION = [^;]+;/g,`MARKETING_VERSION = ${appVersion};`);
  // Restrict the App Store device family to iPhone only (1 = iPhone, 2 = iPad).
  pbx=pbx.replace(/TARGETED_DEVICE_FAMILY = [^;]+;/g,'TARGETED_DEVICE_FAMILY = "1";');
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

  if (process.argv.includes('--meta-events')) {
    const token = process.env.META_IOS_CLIENT_TOKEN?.trim();
    if (!token) throw new Error('Set META_IOS_CLIENT_TOKEN in the Codemagic meta_ios group');
    const replaceRequired = (source, marker, replacement) => {
      if (!source.includes(marker)) throw new Error(`Missing iOS template marker: ${marker}`);
      return source.replace(marker, replacement);
    };

    const packageID = 'A00000000000000000000003';
    const productID = 'A00000000000000000000004';
    const frameworkID = 'A00000000000000000000005';
    pbx = replaceRequired(pbx, '/* Begin PBXBuildFile section */',
      `/* Begin PBXBuildFile section */
        ${frameworkID} /* FacebookCore in Frameworks */ = {isa = PBXBuildFile; productRef = ${productID}; };`);
    pbx = replaceRequired(pbx, '4D22ABE92AF431CB00220026 /* CapApp-SPM in Frameworks */,',
      `4D22ABE92AF431CB00220026 /* CapApp-SPM in Frameworks */,
                ${frameworkID} /* FacebookCore in Frameworks */,`);
    pbx = replaceRequired(pbx, 'packageProductDependencies = (',
      `packageProductDependencies = (
                ${productID} /* FacebookCore */,`);
    pbx = replaceRequired(pbx, 'packageReferences = (',
      `packageReferences = (
                ${packageID} /* facebook-ios-sdk */,`);
    pbx = replaceRequired(pbx, '/* Begin XCSwiftPackageProductDependency section */',
      `/* Begin XCRemoteSwiftPackageReference section */
        ${packageID} /* facebook-ios-sdk */ = {
            isa = XCRemoteSwiftPackageReference;
            repositoryURL = "https://github.com/meta/facebook-ios-sdk.git";
            requirement = {kind = exactVersion; version = 18.0.3; };
        };
/* End XCRemoteSwiftPackageReference section */

/* Begin XCSwiftPackageProductDependency section */
        ${productID} /* FacebookCore */ = {
            isa = XCSwiftPackageProductDependency;
            package = ${packageID};
            productName = FacebookCore;
        };`);
    fs.writeFileSync('ios/App/App.xcodeproj/project.pbxproj', pbx);

    const escapedToken = token.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    plist = replaceRequired(plist, '</dict>\n</plist>', `<key>FacebookAppID</key><string>2101027710610805</string>
<key>FacebookClientToken</key><string>${escapedToken}</string>
<key>FacebookAutoLogAppEventsEnabled</key><true/>
<key>FacebookAdvertiserIDCollectionEnabled</key><false/>
</dict>
</plist>`);
    fs.writeFileSync('ios/App/App/Info.plist', plist);

    const delegatePath = 'ios/App/App/AppDelegate.swift';
    let delegate = fs.readFileSync(delegatePath, 'utf8');
    delegate = replaceRequired(delegate, 'import Capacitor', 'import Capacitor\nimport FacebookCore');
    delegate = replaceRequired(delegate, '        return true',
      '        _ = ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)\n        return true');
    fs.writeFileSync(delegatePath, delegate);
  }
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
