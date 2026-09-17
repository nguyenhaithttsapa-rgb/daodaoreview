import fs from 'fs';
let code = fs.readFileSync('src/app/layout.tsx', 'utf8');

const importScript = `import Script from "next/script";\n`;
if (!code.includes('import Script from')) {
    code = code.replace('import Navbar from "@/components/Navbar";', 'import Navbar from "@/components/Navbar";\n' + importScript);
}

const gaCode = `
        {/* Google Analytics */}
        <Script strategy="afterInteractive" src="https://www.googletagmanager.com/gtag/js?id=G-HYVH98WXZN" />
        <Script id="google-analytics" strategy="afterInteractive">
          {\`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-HYVH98WXZN');
          \`}
        </Script>
`;

code = code.replace('<body className="min-h-full flex flex-col bg-[#05010a] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white relative overflow-x-hidden">', '<body className="min-h-full flex flex-col bg-[#05010a] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white relative overflow-x-hidden">' + gaCode);

fs.writeFileSync('src/app/layout.tsx', code);
