import React, { useState } from "react";
import Landing from "./src/screens/Landing";
import RideDashboard from "./src/screens/RideDashboard";

export default function App() {
  const [view, setView] = useState<"landing" | "rides">("landing");
  return view === "rides"
    ? <RideDashboard />
    : <Landing onAuthenticated={() => setView("rides")} />;
}
