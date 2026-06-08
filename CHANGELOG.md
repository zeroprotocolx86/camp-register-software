# Changelog

## Version 1.2.0 - 2026-06-08

### 🎨 UI Improvements
- **Redesigned README** - modern, beautiful main page with badges and tables
- **Better documentation structure** - clearer navigation and information
- **Updated screenshots** - new interface screenshots showing all features

### 🛡️ Security & Data Protection
- **Camp deletion protection** - confirmation dialog before deleting camps
- **Backup/Restore system** - full data backup and restore via Rust backend
- **Excel export** - automatic .xlsx export through Rust backend

### 🔧 Technical Improvements
- **Fixed tauri-api.js** - resolved API integration issues
- **Backend optimization** - improved Rust command performance
- **Better error handling** - more robust data operations

### 🧹 Cleanup
- **Removed unnecessary files** - deleted FINAL_REPORT.md, GIT_COMMANDS.md, RELEASE_CHECKLIST.md, README_GITHUB.md, GITHUB_SETUP.md
- **Code cleanup** - removed unused code references
- **Simplified project structure** - easier to navigate

### 📦 Release Updates
- **New builds** - fresh executable files for both installer and portable versions
- **Updated version numbers** - consistent versioning across all config files

### 📝 Documentation
- **Enhanced README.md** - beautiful layout with emojis, badges, and tables
- **Better quick start guide** - clearer instructions for new users
- **Improved feature descriptions** - more detailed explanations

---

## Version 1.1.0 - 2026-06-05

### 🎨 UI Improvements
- **Redesigned README** - modern, beautiful main page with badges and tables
- **Better documentation structure** - clearer navigation and information
- **Updated screenshots** - new interface screenshots showing all features

### 🛡️ Security & Data Protection
- **Camp deletion protection** - confirmation dialog before deleting camps
- **Backup/Restore system** - full data backup and restore via Rust backend
- **Excel export** - automatic .xlsx export through Rust backend

### 🔧 Technical Improvements
- **Fixed tauri-api.js** - resolved API integration issues
- **Backend optimization** - improved Rust command performance
- **Better error handling** - more robust data operations

### 🧹 Cleanup
- **Removed unnecessary files** - deleted FINAL_REPORT.md, GIT_COMMANDS.md, RELEASE_CHECKLIST.md, README_GITHUB.md, GITHUB_SETUP.md
- **Code cleanup** - removed unused code references
- **Simplified project structure** - easier to navigate

### 📦 Release Updates
- **New builds** - fresh executable files for both installer and portable versions
- **Updated version numbers** - consistent versioning across all config files

### 📝 Documentation
- **Enhanced README.md** - beautiful layout with emojis, badges, and tables
- **Better quick start guide** - clearer instructions for new users
- **Improved feature descriptions** - more detailed explanations

---

## Version 1.0.1 - 2026-06-05

### 🐛 Bug Fixes
- **CRITICAL FIX:** Fixed crash after entering child's age
  - Replaced invalid `js_sys::Date::now()` with proper Rust `SystemTime`
  - Removed `js-sys` dependency
  - Program now works correctly when registering children

### 📝 Changes
- Updated `lib.rs` to use `std::time::{SystemTime, UNIX_EPOCH}`
- Cleaned up `Cargo.toml` dependencies
- Removed unused imports (`Mutex`, `State`)

### 📦 Releases
- **CampRegister_Setup.exe** - 2.2 MB (NSIS installer)
- **CampRegister_Portable.exe** - 10.59 MB (standalone executable)

---

## Version 1.0.0 - 2026-06-05

### ✨ Initial Release

#### Features
- ✅ Fast child registration (last name, first name, age)
- ✅ Automatic group assignment by age
- ✅ Badge printing 70×30 mm with auto text scaling
- ✅ Print preview before printing
- ✅ Excel export (.xlsx format)
- ✅ Camp history - all previous registrations
- ✅ Backup/restore via JSON files
- ✅ Fully offline - no internet required

#### Network Features
- 🔄 "Auto" mode - automatic server detection
- 🖥️ "Server" mode - main computer with printer
- 💻 "Client" mode - auxiliary computers
- 📡 Automatic synchronization between all computers
- 🔍 Network scanning on port 33445

#### Settings
- 🎨 Colorful groups - customizable colors and names
- 🖨️ Print modes - batch or individual
- 📊 Statistics - total count and by groups
- 💾 Local storage - data is not lost

#### Technology Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Rust, Tauri 2.0
- **Size:** 10.6 MB (portable), 2.2 MB (installer)
- **Platform:** Windows 10/11

#### Author
**Diachuk Andrii Vasylovych**
Email: diachyk4560@gmail.com
