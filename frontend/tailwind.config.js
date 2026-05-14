/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:"#eff6ff",100:"#dbeafe",500:"#3b82f6",600:"#2563eb",700:"#1d4ed8",900:"#1e3a8a" },
        dark:  { 900:"#0f172a",800:"#1e293b",700:"#334155",600:"#475569",500:"#64748b" },
      },
      fontFamily: { sans: ["'Inter'","system-ui","sans-serif"] },
    },
  },
  plugins: [],
}
