const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '../src/data/updates-auto.json');
const PACKAGE_PATH = path.join(__dirname, '../package.json');

// Helper to translate and clean commit messages
function cleanAndFormatText(text) {
  let cleaned = text.trim();
  if (!cleaned) return null;

  // 1. Filter out development or sensitive details
  const filterKeywords = [
    'vercel', 'build', 'ci', 'cd', 'config', 'ignore', 'lint', 'env', 'secret',
    'key', 'db migration', 'migration', 'deployment', 'deploy', 'test', 'setup',
    'npm', 'package', 'dependency', 'webpack', 'hotfix', 'pipeline', 'credentials',
    'token', 'auth config', 'api key', 'password', 'supabase trigger', 'schema',
    'github workflow', 'eslint', 'compile error', 'syntax error', 'package-lock',
    'package.json', 'tsconfig', 'compaction', 'compact', 'compacting', 'merge branch',
    'git', 'repository', 'readme', 'license', 'workflow'
  ];
  
  const lowerText = cleaned.toLowerCase();
  if (filterKeywords.some(keyword => lowerText.includes(keyword))) {
    return null;
  }

  // 2. Detect category and strip prefixes
  let category = 'baru';
  if (/^(feat|feature|baru|new|add):/i.test(cleaned)) {
    category = 'baru';
    cleaned = cleaned.replace(/^(feat|feature|baru|new|add):/i, '');
  } else if (/^(fix|bug|perbaikan|peningkatan|refactor|style|perf|chore|docs|update):/i.test(cleaned)) {
    category = 'peningkatan';
    cleaned = cleaned.replace(/^(fix|bug|perbaikan|peningkatan|refactor|style|perf|chore|docs|update):/i, '');
  }

  cleaned = cleaned.trim();

  // 3. Translate common English technical terms to Indonesian
  const translations = [
    [/mobile/gi, 'HP'],
    [/wallet/gi, 'dompet'],
    [/budget/gi, 'anggaran'],
    [/transaction/gi, 'transaksi'],
    [/chart|graph/gi, 'grafik'],
    [/auth|login/gi, 'masuk akun'],
    [/streak/gi, 'streak catatan'],
    [/UI|design/gi, 'tampilan'],
    [/button/gi, 'tombol'],
    [/error|crash/gi, 'kendala'],
    [/optimize|optimization/gi, 'optimalisasi'],
    [/caching|cache/gi, 'penyimpanan sementara'],
    [/mascot/gi, 'maskot Fimo'],
    [/darkmode|dark mode/gi, 'mode gelap'],
    [/popup|pop up|dialog/gi, 'pop-up dialog'],
    [/sidebar/gi, 'bilah samping'],
    [/header|navbar/gi, 'navigasi atas'],
    [/loading|loader/gi, 'loading screen'],
    [/skeleton/gi, 'tampilan loading'],
    [/report/gi, 'laporan'],
    [/category/gi, 'kategori'],
    [/reminder/gi, 'pengingat'],
    [/setting/gi, 'pengaturan']
  ];

  translations.forEach(([regex, replacer]) => {
    cleaned = cleaned.replace(regex, replacer);
  });

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  return {
    category,
    text: cleaned
  };
}

function generateUpdates() {
  console.log('Generating updates.json dynamically from git log...');

  let currentHash = '';
  try {
    currentHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (err) {
    console.warn('Could not retrieve current HEAD commit hash:', err.message);
  }

  // Read existing auto-updates config
  let lastCommitHash = '';
  let existingVersion = '';
  try {
    if (fs.existsSync(OUTPUT_PATH)) {
      const data = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
      lastCommitHash = data.lastCommitHash || '';
      existingVersion = data.version || '';
    }
  } catch (err) {
    console.warn('Could not read existing updates-auto.json:', err.message);
  }

  // Read base version from package.json
  let pkgVersion = '1.2.0';
  let indent = 2;
  try {
    if (fs.existsSync(PACKAGE_PATH)) {
      const pkgContent = fs.readFileSync(PACKAGE_PATH, 'utf8');
      const match = pkgContent.match(/^[\s\t]+/m);
      if (match) indent = match[0];
      const packageJson = JSON.parse(pkgContent);
      if (packageJson.version) {
        pkgVersion = packageJson.version;
      }
    }
  } catch (err) {
    console.warn('Could not read package.json version:', err.message);
  }

  let finalVersion = existingVersion || `v${pkgVersion}`;

  // Prevent double-bumping by checking if we have already built/processed this commit hash
  if (currentHash && currentHash === lastCommitHash) {
    console.log(`Commit hash (${currentHash}) has not changed. Skipping version bump.`);
  } else {
    // Retrieve new commit messages since lastCommitHash to detect the bump type
    let commitMessages = [];
    if (currentHash) {
      try {
        let gitCmd = 'git log -n 15 --pretty=format:"%s"';
        if (lastCommitHash) {
          try {
            // Check if lastCommitHash is still an ancestor of current HEAD (valid history path)
            execSync(`git merge-base --is-ancestor ${lastCommitHash} HEAD`, { stdio: 'ignore' });
            gitCmd = `git log ${lastCommitHash}..HEAD --pretty=format:"%s"`;
            console.log(`Retrieving commits since last release commit: ${lastCommitHash}`);
          } catch (_) {
            console.log('lastCommitHash is not an ancestor, checking last 15 commits instead.');
          }
        } else {
          console.log('No previous commit hash stored, evaluating last 15 commits.');
        }
        const logOutput = execSync(gitCmd, { encoding: 'utf8' });
        commitMessages = logOutput.split('\n').map(s => s.trim()).filter(Boolean);
      } catch (err) {
        console.warn('Could not retrieve git commits for analysis:', err.message);
      }
    }

    // Determine bump type
    let bumpType = 'patch'; // Default to minor/patch update
    if (commitMessages.length > 0) {
      const isMajor = commitMessages.some(msg => 
        /breaking change/i.test(msg) || /major:/i.test(msg)
      );
      const isMinor = commitMessages.some(msg => 
        /^(feat|feature|baru|new|add|menengah):/i.test(msg)
      );

      if (isMajor) {
        bumpType = 'major';
      } else if (isMinor) {
        bumpType = 'minor';
      }
    }

    // Perform version bump
    const parts = pkgVersion.split('.').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      let [major, minor, patch] = parts;
      if (bumpType === 'major') {
        major += 1;
        minor = 0;
        patch = 0;
      } else if (bumpType === 'minor') {
        minor += 1;
        patch = 0;
      } else {
        patch += 1;
      }
      const newVersion = `${major}.${minor}.${patch}`;
      console.log(`Detected bump type: ${bumpType}. Bumping version from ${pkgVersion} to ${newVersion}`);
      pkgVersion = newVersion;
      finalVersion = `v${newVersion}`;

      // Write updated version back to package.json
      try {
        if (fs.existsSync(PACKAGE_PATH)) {
          const pkgContent = fs.readFileSync(PACKAGE_PATH, 'utf8');
          const packageJson = JSON.parse(pkgContent);
          packageJson.version = newVersion;
          fs.writeFileSync(PACKAGE_PATH, JSON.stringify(packageJson, null, indent) + '\n', 'utf8');
          console.log(`Successfully updated package.json version to: ${newVersion}`);
        }
      } catch (err) {
        console.error('Failed to write version to package.json:', err.message);
      }
    }
  }

  // Compile recent updates list (display up to 50 commits to the user in the UI)
  // Use today's date formatted in Indonesian locale as default fallback
  const today = new Date();
  const defaultOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  let dateStr = today.toLocaleDateString('id-ID', defaultOptions);
  const items = [];

  try {
    // Run git log to get hash, subject, date of the last 50 commits
    const gitLog = execSync('git log -n 50 --pretty=format:"%h|%s|%ad" --date=short', { encoding: 'utf8' });
    const lines = gitLog.split('\n');

    if (lines.length > 0 && lines[0]) {
      // Use the date of the latest commit for release date
      const latestCommitDate = lines[0].split('|')[2];
      if (latestCommitDate) {
        const dateObj = new Date(latestCommitDate);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        dateStr = dateObj.toLocaleDateString('id-ID', options);
      }
    }

    lines.forEach(line => {
      const parts = line.split('|');
      if (parts.length < 2) return;
      const subject = parts[1];
      const cleaned = cleanAndFormatText(subject);
      if (cleaned) {
        // Prevent duplicate texts in the list
        if (!items.some(item => item.text === cleaned.text)) {
          items.push({
            category: cleaned.category,
            text: cleaned.text
          });
        }
      }
    });
  } catch (err) {
    console.warn('Git log execution failed. Using default updates fallback:', err.message);
  }

  // Fallback items if we couldn't retrieve commits or if all commits were filtered
  if (items.length === 0) {
    items.push(
      {
        category: 'baru',
        text: 'Optimalisasi tampilan loading skeleton kustom per halaman'
      },
      {
        category: 'baru',
        text: 'Penyesuaian warna gelap netral arang/hitam tanpa navy'
      },
      {
        category: 'peningkatan',
        text: 'Perbaikan responsivitas pop-up dialog grafik di layar HP'
      },
      {
        category: 'peningkatan',
        text: 'Integrasi sistem streak catatan harian dengan dialog brutalist'
      }
    );
  }

  const outputData = {
    version: finalVersion,
    date: dateStr,
    items,
    lastCommitHash: currentHash || lastCommitHash
  };

  // Ensure output directory exists
  const publicDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`Successfully generated updates.json with ${items.length} items. Version: ${finalVersion}`);
}

generateUpdates();
