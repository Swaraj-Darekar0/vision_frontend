const fs = require("fs");
const path = require("path");

const projectRoot = __dirname ? path.resolve(__dirname, "..") : process.cwd();
const audioApiAndroidDir = path.join(
  projectRoot,
  "node_modules",
  "react-native-audio-api",
  "android"
);

const buildGradlePath = path.join(audioApiAndroidDir, "build.gradle");
const cmakePath = path.join(audioApiAndroidDir, "CMakeLists.txt");
const audioApiSourcesCmakePath = path.join(
  audioApiAndroidDir,
  "src",
  "main",
  "cpp",
  "audioapi",
  "CMakeLists.txt"
);
const audioApiModulePath = path.join(
  audioApiAndroidDir,
  "src",
  "main",
  "java",
  "com",
  "swmansion",
  "audioapi",
  "AudioAPIModule.kt"
);

function patchFile(filePath, transform) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[fix-rn-audio-api] Skipping missing file: ${filePath}`);
    return false;
  }

  const original = fs.readFileSync(filePath, "utf8");
  const updated = transform(original);

  if (updated === original) {
    return false;
  }

  fs.writeFileSync(filePath, updated, "utf8");
  return true;
}

const gradlePatched = patchFile(buildGradlePath, (content) => {
  let updated = content;

  const target = `  externalNativeBuild {\n    cmake {\n      path "CMakeLists.txt"\n    }\n  }`;
  const replacement = `  externalNativeBuild {\n    cmake {\n      path "CMakeLists.txt"\n      buildStagingDirectory "\${rootProject.projectDir}/.cxx/rnaa"\n    }\n  }`;
  if (!updated.includes('buildStagingDirectory "${rootProject.projectDir}/.cxx/rnaa"')) {
    updated = updated.includes(target) ? updated.replace(target, replacement) : updated;
  }

  const bashDownloadTask = `task downloadPrebuiltBinaries(type: Exec) {
  commandLine 'chmod', '+x', '../scripts/download-prebuilt-binaries.sh'
  commandLine 'bash', '../scripts/download-prebuilt-binaries.sh'
  args 'android', isFFmpegDisabled() ? 'skipffmpeg' : ''
}`;

  const windowsSafeDownloadTask = `task downloadPrebuiltBinaries {
  def mainDownloadUrl = "https://github.com/software-mansion-labs/rn-audio-libs/releases/download"
  def tag = "v2.0.0"
  def downloadNames = [
    "armeabi-v7a.zip",
    "arm64-v8a.zip",
    "x86.zip",
    "x86_64.zip",
    "ffmpeg_ios.zip",
    "iphoneos.zip",
    "iphonesimulator.zip",
    "jniLibs.zip"
  ]
  def tempDownloadDir = file("\${projectDir}/audioapi-binaries-temp")
  def projectRoot = file("\${projectDir}/..")
  def jniLibsDestination = file("\${projectRoot}/android/src/main")
  def normalDestination = file("\${projectRoot}/common/cpp/audioapi/external")

  doLast {
    tempDownloadDir.mkdirs()
    downloadNames.each { name ->
      def extractedDirName = name.replace(".zip", "")
      if ((extractedDirName == "ffmpeg_ios" || extractedDirName == "jniLibs") && isFFmpegDisabled()) {
        return
      }

      def outputDir = name == "jniLibs.zip" ? jniLibsDestination : normalDestination
      def finalCheckPath = file("\${outputDir}/\${extractedDirName}")
      if (finalCheckPath.exists()) {
        return
      }

      outputDir.mkdirs()
      def zipFile = file("\${tempDownloadDir}/\${name}")
      new URL("\${mainDownloadUrl}/\${tag}/\${name}").withInputStream { input ->
        zipFile.withOutputStream { output -> output << input }
      }
      copy {
        from zipTree(zipFile)
        into outputDir
        exclude "__MACOSX/**"
      }
    }
    delete tempDownloadDir
  }
}`;

  if (updated.includes(bashDownloadTask)) {
    updated = updated.replace(bashDownloadTask, windowsSafeDownloadTask);
  }

  return updated;
});

const cmakePatched = patchFile(cmakePath, (content) => {
  let updated = content.replace('set(CMAKE_OBJECT_PATH_MAX 128)\n', "");

  if (!updated.includes("set(CMAKE_OBJECT_PATH_MAX 250)")) {
    const target = "set(CMAKE_CXX_STANDARD 20)\n";
    const replacement =
      'set(CMAKE_CXX_STANDARD 20)\nset(CMAKE_OBJECT_PATH_MAX 250)\n';
    updated = updated.includes(target) ? updated.replace(target, replacement) : updated;
  }

  return updated;
});

const audioApiSourcesPatched = patchFile(audioApiSourcesCmakePath, (content) => {
  let updated = content;

  updated = updated.replace(
    'file(GLOB_RECURSE ANDROID_CPP_SOURCES CONFIGURE_DEPENDS "${ANDROID_CPP_DIR}/audioapi/*.cpp")',
    'file(GLOB_RECURSE ANDROID_CPP_SOURCES RELATIVE "${CMAKE_CURRENT_SOURCE_DIR}" CONFIGURE_DEPENDS "${ANDROID_CPP_DIR}/audioapi/*.cpp")'
  );

  updated = updated.replace(
    'file(GLOB_RECURSE ANDROID_CPP_SOURCES RELATIVE "${CMAKE_SOURCE_DIR}" CONFIGURE_DEPENDS "src/main/cpp/audioapi/*.cpp")',
    'file(GLOB_RECURSE ANDROID_CPP_SOURCES RELATIVE "${CMAKE_CURRENT_SOURCE_DIR}" CONFIGURE_DEPENDS "${ANDROID_CPP_DIR}/audioapi/*.cpp")'
  );

  updated = updated.replace(
    'file(GLOB_RECURSE ANDROID_CPP_SOURCES RELATIVE "${CMAKE_SOURCE_DIR}" CONFIGURE_DEPENDS "${ANDROID_CPP_DIR}/audioapi/*.cpp")',
    'file(GLOB_RECURSE ANDROID_CPP_SOURCES RELATIVE "${CMAKE_CURRENT_SOURCE_DIR}" CONFIGURE_DEPENDS "${ANDROID_CPP_DIR}/audioapi/*.cpp")'
  );

  updated = updated.replace(
    'file(GLOB_RECURSE COMMON_CPP_SOURCES CONFIGURE_DEPENDS "${COMMON_CPP_DIR}/audioapi/*.cpp" "${COMMON_CPP_DIR}/audioapi/*.c")',
    'file(GLOB_RECURSE COMMON_CPP_SOURCES RELATIVE "${CMAKE_CURRENT_SOURCE_DIR}" CONFIGURE_DEPENDS "${COMMON_CPP_DIR}/audioapi/*.cpp" "${COMMON_CPP_DIR}/audioapi/*.c")'
  );

  updated = updated.replace(
    'file(GLOB_RECURSE COMMON_CPP_SOURCES RELATIVE "${CMAKE_SOURCE_DIR}" CONFIGURE_DEPENDS "../common/cpp/audioapi/*.cpp" "../common/cpp/audioapi/*.c")',
    'file(GLOB_RECURSE COMMON_CPP_SOURCES RELATIVE "${CMAKE_CURRENT_SOURCE_DIR}" CONFIGURE_DEPENDS "${COMMON_CPP_DIR}/audioapi/*.cpp" "${COMMON_CPP_DIR}/audioapi/*.c")'
  );

  updated = updated.replace(
    'file(GLOB_RECURSE COMMON_CPP_SOURCES RELATIVE "${CMAKE_SOURCE_DIR}" CONFIGURE_DEPENDS "${COMMON_CPP_DIR}/audioapi/*.cpp" "${COMMON_CPP_DIR}/audioapi/*.c")',
    'file(GLOB_RECURSE COMMON_CPP_SOURCES RELATIVE "${CMAKE_CURRENT_SOURCE_DIR}" CONFIGURE_DEPENDS "${COMMON_CPP_DIR}/audioapi/*.cpp" "${COMMON_CPP_DIR}/audioapi/*.c")'
  );

  updated = updated.replace(
    '"${COMMON_CPP_DIR}/audioapi/libs/ffmpeg/FFmpegDecoding.cpp"',
    '"../../../../common/cpp/audioapi/libs/ffmpeg/FFmpegDecoding.cpp"'
  );

  updated = updated.replace(
    '"../common/cpp/audioapi/libs/ffmpeg/FFmpegDecoding.cpp"',
    '"../../../../common/cpp/audioapi/libs/ffmpeg/FFmpegDecoding.cpp"'
  );

  return updated;
});

const audioApiModulePatched = patchFile(audioApiModulePath, (content) => {
  let updated = content;

  updated = updated.replace(
    'import com.facebook.react.bridge.ReactMethod\n',
    ''
  );

  updated = updated.replace(
    '  @ReactMethod(isBlockingSynchronousMethod = true)\n  fun resolveAndroidReleaseAsset(assetPath: String?): String? {\n',
    '  override fun resolveAndroidReleaseAsset(assetPath: String?): String? {\n'
  );

  return updated;
});

if (gradlePatched || cmakePatched || audioApiSourcesPatched || audioApiModulePatched) {
  console.log("[fix-rn-audio-api] Applied Windows-native build path fix for react-native-audio-api.");
} else {
  console.log("[fix-rn-audio-api] No changes needed.");
}
