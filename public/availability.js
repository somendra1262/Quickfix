document.addEventListener("DOMContentLoaded", function () { 
    const form = document.getElementById("availability-form");
    const availabilityList = document.getElementById("availability-list");

    let userId = null;

    async function fetchUserSession() {
        try {
            const response = await fetch("/auth/user", { credentials: "include" });
            if (!response.ok) throw new Error("Failed to fetch user session");

            const userData = await response.json();
            userId = userData.userId;

            if (!userId) {
                alert("You must be logged in to set availability.");
                return;
            }

            fetchAvailability();
        } catch (error) {
            console.error("Error fetching user session:", error);
        }
    }

    async function fetchAvailability() {
        if (!userId) return;

        try {
            const response = await fetch(`/get-doctor-availability/${userId}`, { credentials: "include" });
            if (!response.ok) throw new Error("Failed to fetch availability");

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                availabilityList.innerHTML = "<p>No availability set yet.</p>";
            } else {
                availabilityList.innerHTML = data.map(item => `
                    <div>
                        <strong>${item.day}</strong>: ${item.startTime} - ${item.endTime}
                    </div>
                `).join("");
            }
        } catch (error) {
            console.error("Error fetching availability:", error);
            availabilityList.innerHTML = "<p>Error loading availability.</p>";
        }
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!userId) {
            alert("You must be logged in to set availability.");
            return;
        }

        const day = document.getElementById("day").value;
        const startTime = document.getElementById("start-time").value;
        const endTime = document.getElementById("end-time").value;

        try {
            const response = await fetch("/set-availability", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userId, day, startTime, endTime })
            });

            if (!response.ok) throw new Error("Failed to save availability");

            const result = await response.json();
            alert(result.message);
            fetchAvailability();
        } catch (error) {
            console.error("Error saving availability:", error);
        }
    });

    fetchUserSession();
});
