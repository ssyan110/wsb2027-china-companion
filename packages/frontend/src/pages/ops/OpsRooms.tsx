export function OpsRooms() {
  return (
    <div data-testid="ops-rooms-page" style={{ padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Room Assignments</h1>
      <p style={{ color: '#666' }}>
        Room assignment view grouped by room_assignment_seq. Displays roommate pairings,
        room numbers, occupancy types, and hotel confirmation numbers.
      </p>
    </div>
  );
}

export default OpsRooms;
