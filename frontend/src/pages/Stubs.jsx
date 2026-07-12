// Stubs.jsx — placeholder pages so routing/navigation works from day one.
// Replace each with a real page (copy Vehicles.jsx's structure: load in
// useEffect, render a table, add a form gated by role via useAuth()).

function Stub({ title, owner }) {
  return (
    <div>
      <h2>{title}</h2>
      <p style={{ color: '#666', fontSize: 13 }}>
        Not built yet — suggested owner: <strong>{owner}</strong>. See Vehicles.jsx for the page pattern to copy.
      </p>
    </div>
  );
}

export function Drivers() {
  return <Stub title="Drivers & Safety Profiles" owner="Person B (People & Trips)" />;
}

export function Maintenance() {
  return <Stub title="Maintenance" owner="Person A (Fleet & Assets)" />;
}

export function Analytics() {
  return <Stub title="Reports & Analytics" owner="Person C (Money & Insights)" />;
}


