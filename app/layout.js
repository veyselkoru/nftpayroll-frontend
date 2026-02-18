import "./globals.css";
import Providers from "./Providers";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata = {
  title: "NFTPAYROLL Admin",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className={`${outfit.className} bg-gray-50 text-gray-900`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
