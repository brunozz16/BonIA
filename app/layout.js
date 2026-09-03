import { Poppins } from "next/font/google";
import { config } from "./config";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--fuente-poppins",
  display: "swap",
});

export const metadata = {
  title: config.marca,
  description: `Participá en las dinámicas de ${config.marca} 💖`,
};

export const viewport = {
  themeColor: "#ff5da8",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
