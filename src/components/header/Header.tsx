import DesktopHeader from "./DesktopHeader";
import MobileHeader from "./MobileHeader";

export default function Header({
  isNativeAndroidApp = false,
}: {
  isNativeAndroidApp?: boolean;
}) {
  return (
    <header className="w-full">
      <div className="md:hidden">
        <MobileHeader isNativeAndroidApp={isNativeAndroidApp} />
      </div>
      <div className="hidden md:block">
        <DesktopHeader isNativeAndroidApp={isNativeAndroidApp} />
      </div>
    </header>
  );
}
