async function fetchDoctorAvailability() {
    const doctorId = document.getElementById("doctor-id").value;
    const availabilityDiv = document.getElementById("doctor-availability");

    if (!doctorId) {
        alert("Please enter a doctor's ID.");
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/get-doctor-availability/${doctorId}`);
        const data = await response.json();

        if (data.message) {
            availabilityDiv.innerHTML = `<p>${data.message}</p>`;
        } else {
            availabilityDiv.innerHTML = data.map(item => `
                <div>
                    <strong>${item.day}</strong>: ${item.startTime} - ${item.endTime}
                </div>
            `).join("");
        }
    } catch (error) {
        console.error("Error fetching doctor availability:", error);
        availabilityDiv.innerHTML = "<p>Error loading availability.</p>";
    }
}
