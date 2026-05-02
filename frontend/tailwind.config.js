/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#090b0a",
        shell: "#111514",
        panel: "#151a18",
        panelStrong: "#1a201d",
        panelSoft: "#0f1312",
        ink: "#f3f2ec",
        muted: "#b8beb4",
        soft: "#8e948b",
        accent: "#c57a4a",
        line: "rgba(243, 242, 236, 0.1)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      boxShadow: {
        diffusion: "0 36px 90px -38px rgba(0, 0, 0, 0.65)",
        shell: "0 32px 80px -40px rgba(0, 0, 0, 0.72)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        pulseSoft: "pulseSoft 4s ease-in-out infinite",
        scan: "scan 14s linear infinite",
        reveal: "reveal 800ms cubic-bezier(0.32,0.72,0,1) both",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(120%)" },
        },
        reveal: {
          "0%": {
            opacity: "0",
            transform: "translate3d(0, 2.5rem, 0)",
            filter: "blur(8px)",
          },
          "100%": {
            opacity: "1",
            transform: "translate3d(0, 0, 0)",
            filter: "blur(0)",
          },
        },
      },
    },
  },
  plugins: [],
};
