export function OpsFlights() {
  return (
    <div data-testid="ops-flights-page" style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Flight Details</h1>
      <p style={{ color: '#666' }}>
        Arrival and departure flight information for all travelers, including airline,
        flight number, time, airport, and terminal details.
      </p>
    </div>
  );
}

export default OpsFlights;
