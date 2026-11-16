import { Geist } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata = {
  title: "Urjacon Process System",
  description: "PM Surya Ghar case lifecycle (dummy)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
