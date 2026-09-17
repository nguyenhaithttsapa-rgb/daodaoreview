import fs from 'fs';
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Use regex to remove the Navigation Actions block securely regardless of encoding
code = code.replace(/\{\/\* Navigation Actions \*\/\}[\s\S]*?<\/div>/, '');

fs.writeFileSync('src/components/Navbar.tsx', code);
