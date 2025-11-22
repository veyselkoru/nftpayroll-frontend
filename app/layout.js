import "./globals.css";

export const metadata = {
  title: "NFTPAYROLL Admin",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className="bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
