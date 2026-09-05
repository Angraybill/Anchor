import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { demoClient } from "./lib/client";
import { demoStudents } from "./lib/demo-fixtures";
import { isSupabaseConfigured } from "./lib/supabase";

function PlatformReady() {
  const [actor, setActor] = useState(demoClient.currentActor);

  useEffect(() => demoClient.subscribe(() => setActor(demoClient.currentActor)), []);

  return (
    <main>
      <h1>Anchor platform ready</h1>
      <p>Demo actor: {actor.displayName}</p>
      <p>Feature branches can now build against the shared client contract and deterministic fixtures.</p>
      <p>Supabase connection: {isSupabaseConfigured ? "configured" : "local demo only"}</p>
      {import.meta.env.DEV && (
        <section aria-label="Demo session controls">
          <p><strong>Developer-only demo control.</strong> This switcher is excluded from the production UI.</p>
          <label>
            Demo session
            <select
              value={actor.id}
              onChange={(event) => demoClient.setDemoActor(event.target.value as typeof actor.id)}
            >
              {demoStudents.map((student) => <option key={student.id} value={student.id}>{student.displayName}</option>)}
            </select>
          </label>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<PlatformReady />);
