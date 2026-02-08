import "./overlay.css";

export const metadata = {
  title: "Alert Overlay",
};

export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="overlay-body">{children}</body>
    </html>
  );
}
