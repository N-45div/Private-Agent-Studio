/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f3f0e8",
        ink: "#121212",
        shell: "#e6dfd2",
        accent: "#c94b2c",
        signal: "#1f4fd1",
        mist: "#f7f3eb",
        line: "rgba(18, 18, 18, 0.1)",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      boxShadow: {
        diffusion: "0 28px 60px -28px rgba(18, 18, 18, 0.16)",
        shell: "0 26px 50px -30px rgba(18, 18, 18, 0.18)",
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
