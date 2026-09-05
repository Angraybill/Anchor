import { createRoot } from "react-dom/client";
import { demoClient } from "./lib/client";

function PlatformReady() {
  return (
    <main>
      <h1>Anchor platform ready</h1>
      <p>Demo actor: {demoClient.currentActor.displayName}</p>
      <p>Feature branches can now build against the shared client contract and deterministic fixtures.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<PlatformReady />);
