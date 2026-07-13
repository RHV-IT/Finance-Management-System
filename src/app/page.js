import Image from "next/image";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";

export default function Home() {
  return (
    <main>
      <Topbar/>
      <Sidebar/>
    </main>
  );
}
