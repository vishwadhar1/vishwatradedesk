import { SettingsTabs } from "./SettingsTabs";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <h1 className="text-text mb-4 text-lg font-medium">Settings</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}
