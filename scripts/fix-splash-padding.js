const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = [
  { path: 'android/app/src/main/res/drawable-hdpi/splashscreen_logo.png', w: 432, h: 432 },
  { path: 'android/app/src/main/res/drawable-mdpi/splashscreen_logo.png', w: 288, h: 288 },
  { path: 'android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png', w: 576, h: 576 },
  { path: 'android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png', w: 864, h: 864 },
  { path: 'android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo.png', w: 1152, h: 1152 },
  { path: 'android/app/src/main/res/drawable/splashscreen_logo.png', w: 1024, h: 1024 }
];

const root = 'E:/visionFrontend/frontend/SpeakingCoach';

files.forEach(file => {
  const fullPath = path.join(root, file.path);
  const tempPath = fullPath + '.tmp.png';
  
  console.log(`Processing ${file.path}...`);
  
  try {
    // Scale down the content to 60% and pad back to original dimensions
    const cmd = `ffmpeg -i "${fullPath}" -vf "scale=iw*0.6:ih*0.6,pad=${file.w}:${file.h}:(ow-iw)/2:(oh-ih)/2:color=black@0" "${tempPath}" -y`;
    execSync(cmd);
    fs.renameSync(tempPath, fullPath);
    console.log(`Successfully processed ${file.path}`);
  } catch (err) {
    console.error(`Error processing ${file.path}:`, err.message);
  }
});
