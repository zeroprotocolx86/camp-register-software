# 🛠️ Інструкція для розробників

## Вимоги

### Обов'язкове ПЗ
- **Node.js** 18+ ([завантажити](https://nodejs.org/))
- **Rust** 1.70+ ([завантажити](https://rustup.rs/))
- **Git** ([завантажити](https://git-scm.com/))

### Для Windows
- **Visual Studio Build Tools** або **Visual Studio 2022**
- **WebView2** (вбудований в Windows 10/11)

---

## 📥 Клонування та встановлення

```bash
# Клонування репозиторію
git clone https://github.com/YOUR_USERNAME/camp-register.git
cd camp-register

# Встановлення Node.js залежностей
npm install

# Встановлення Tauri CLI
cargo install tauri-cli
```

---

## 🚀 Запуск в режимі розробки

```bash
# Запуск dev версії з гарячим перезавантаженням
npm run tauri dev
```

Програма відкриється автоматично. Зміни в HTML/CSS/JS застосовуються автоматично.

---

## 🔨 Збірка для production

```bash
# Повна збірка для Windows
npm run tauri build
```

Готові файли будуть в:
```
src-tauri/target/release/bundle/nsis/
  - CampRegister_Setup.exe (інсталятор)
  - CampRegister_Portable.exe (portable версія)
```

---

## 📁 Структура проекту

```
camp-register/
├── dist/                      # Frontend файли
│   ├── index.html            # Головна HTML сторінка
│   ├── style.css             # Стилі
│   ├── main.js               # JavaScript логіка
│   └── tauri-api.js          # Tauri API обгортка
│
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── lib.rs           # Головна логіка (Tauri commands)
│   │   └── main.rs          # Точка входу
│   ├── icons/               # Іконки додатку
│   ├── Cargo.toml           # Rust залежності
│   └── tauri.conf.json      # Конфігурація Tauri
│
├── releases/                 # Готові .exe файли
├── docs/                     # Документація
├── screenshots/              # Скріншоти
├── README.md                 # Головна документація
├── CHANGELOG.md              # Список змін
├── LICENSE                   # MIT ліцензія
└── .gitignore               # Git ignore правила
```

---

## 🔧 Налаштування середовища

### VS Code (рекомендовано)

Встановіть розширення:
- **rust-analyzer** - підтримка Rust
- **Tauri** - підтримка Tauri
- **ESLint** - лінтер для JavaScript

### Налаштування Rust

```bash
# Оновлення Rust до останньої версії
rustup update

# Встановлення target для Windows
rustup target add x86_64-pc-windows-msvc
```

---

## 🐛 Відлагодження

### JavaScript (Frontend)

1. Запустіть `npm run tauri dev`
2. Натисніть `F12` в програмі
3. Відкриється DevTools (як в Chrome)

### Rust (Backend)

1. Додайте `println!` або `dbg!` в код
2. Перегляньте вивід в терміналі

```rust
#[tauri::command]
fn save_child(village: String, date: String, child: Child) -> Result<f64, String> {
    println!("Saving child: {:?}", child);
    // ... код
}
```

---

## 📝 Додавання нових функцій

### 1. Додати Tauri Command (Rust)

**src-tauri/src/lib.rs:**
```rust
#[tauri::command]
fn my_new_function(param: String) -> Result<String, String> {
    Ok(format!("Received: {}", param))
}

// Додати в invoke_handler:
.invoke_handler(tauri::generate_handler![
    // ... інші функції
    my_new_function
])
```

### 2. Викликати з JavaScript

**dist/main.js:**
```javascript
async function callMyFunction() {
    const result = await window.api.myNewFunction("test");
    console.log(result);
}
```

**dist/tauri-api.js:** (додати обгортку)
```javascript
window.api = {
    // ... інші функції
    myNewFunction: (param) => invoke('my_new_function', { param })
};
```

---

## 🧪 Тестування

### Ручне тестування

1. Запустіть `npm run tauri dev`
2. Перевірте всі функції:
   - Реєстрація дітей
   - Друк бейджиків
   - Експорт в Excel
   - Мережева синхронізація
   - Бекап/відновлення

### Тестування збірки

```bash
# Збірка
npm run tauri build

# Встановлення з інсталятора
./src-tauri/target/release/bundle/nsis/CampRegister_Setup.exe

# Або запуск portable
./src-tauri/target/release/bundle/nsis/CampRegister_Portable.exe
```

---

## 🚨 Часті проблеми

### Помилка: "cargo не розпізнано"

**Рішення:** Перезапустіть термінал після встановлення Rust

### Помилка: "WebView2 not found"

**Рішення:** WebView2 вже вбудований в Windows 10/11. Якщо немає - завантажте з [офіційного сайту](https://developer.microsoft.com/microsoft-edge/webview2/)

### Помилка компіляції Rust

**Рішення:**
```bash
# Очистити кеш
cargo clean

# Оновити Rust
rustup update

# Повторна збірка
cargo build --release
```

### Програма повільно компілюється

**Це нормально!** Перша компіляція Rust займає 10-20 хвилин. Наступні - 1-2 хвилини.

---

## 📚 Корисні ресурси

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Serde JSON](https://docs.rs/serde_json/)
- [MDN Web Docs](https://developer.mozilla.org/)

---

## 🤝 Внесок в проект

1. Fork репозиторію
2. Створіть нову гілку: `git checkout -b feature/my-feature`
3. Зробіть зміни та комміт: `git commit -am 'Add new feature'`
4. Push: `git push origin feature/my-feature`
5. Створіть Pull Request

---

## 📞 Контакти

**Автор:** Дячук Андрій Васильович  
**Email:** diachyk4560@gmail.com  
**GitHub:** [посилання на ваш профіль]

---

## 📄 Ліцензія

MIT License - дивіться [LICENSE](LICENSE)
