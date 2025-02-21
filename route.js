const directionsKey = API_KEY;

const map = new mapgl.Map('container', {
  center: [37.668598, 55.76259],
  zoom: 13,
  key: API_KEY,
});

const directions = new mapgl.Directions(map, {
  directionsApiKey: API_KEY,
});

const markers = [];
let firstPoint = null;
let secondPoint = null;

const calculateRouteButton = document.getElementById('calculateRoute');
const resetButton = document.getElementById('reset');
const routeTimeEl = document.getElementById('routeTime');

// При клике по карте сохраняем координаты (возвращаются как массив [lng, lat])
map.on('click', (e) => {
  if (firstPoint && secondPoint) return; 

  const coords = e.lngLat;
  if (!firstPoint) {
    firstPoint = coords;
  } else if (!secondPoint) {
    secondPoint = coords;
    calculateRouteButton.disabled = false;
    resetButton.disabled = false;
  }
  markers.push(new mapgl.Marker(map, {
    coordinates: coords,
    icon: 'https://docs.2gis.com/img/dotMarker.svg',
  }));
});

// Сброс точек, маршрута и маркеров
resetButton.addEventListener('click', () => {
  firstPoint = null;
  secondPoint = null;
  directions.clear();
  markers.forEach(marker => marker.destroy());
  markers.length = 0;
  calculateRouteButton.disabled = true;
  resetButton.disabled = true;
  routeTimeEl.textContent = "";
});



async function fetchRouteForWeek() {
    if (!firstPoint || !secondPoint) return;

    const morningTime = document.getElementById("morningTime").value;
    const dayTime = document.getElementById("dayTime").value;
    const eveningTime = document.getElementById("eveningTime").value;

    if (!morningTime || !dayTime || !eveningTime) {
        alert("Выберите все три времени!");
        return;
    }

    const timePeriods = [
        { label: "утро", time: morningTime },
        { label: "день", time: dayTime },
        { label: "вечер", time: eveningTime }
    ];

    const now = new Date();
    let fileContent = "";

    let routePoints = []; 

    for (let i = 0; i < 7; i++) {
        const requestDate = new Date(now);
        requestDate.setDate(now.getDate() + i);

        const dayOfWeek = requestDate.toLocaleDateString("ru-RU", { weekday: "long" });
        const formattedDate = requestDate.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });

        fileContent += `${formattedDate} (${dayOfWeek}):\n`;

        for (const period of timePeriods) {
            const [hours, minutes] = period.time.split(":").map(Number);
            requestDate.setHours(hours, minutes, 0, 0);
            const timestamp = Math.floor(requestDate.getTime() / 1000);

            const query = {
                type: 'statistic',
                utc: timestamp,
                points: [
                    { type: 'walking', x: firstPoint[0], y: firstPoint[1] },
                    { type: 'walking', x: secondPoint[0], y: secondPoint[1] },
                ],
            };

            try {
                const response = await fetch(`https://catalog.api.2gis.ru/carrouting/6.0.0/global?key=${directionsKey}`, {
                    method: 'post',
                    body: JSON.stringify(query),
                });

                if (response.status !== 200) {
                    throw new Error(`HTTP code is ${response.status}`);
                }

                const data = await response.json();
                if (data.result && data.result.length > 0) {
                    const routeResult = data.result[0];
                    if (routeResult.total_duration) {
                        const travelTimeMinutes = Math.round(routeResult.total_duration / 60);
                        fileContent += `  - ${period.label}: ${period.time} - Время маршрута: ${travelTimeMinutes} мин.\n`;

                        routePoints = [firstPoint, secondPoint];
                    } else {
                        fileContent += `  - ${period.label}: ${period.time} - Нет данных\n`;
                    }
                } else {
                    fileContent += `  - ${period.label}: ${period.time} - Маршрут не найден!\n`;
                }
            } catch (error) {
                console.error("Ошибка запроса маршрута:", error);
                fileContent += `  - ${period.label}: ${period.time} - Ошибка при получении данных!\n`;
            }
        }

        fileContent += "\n";
    }

    if (fileContent) {
        downloadRouteFile(fileContent);
    } else {
        alert("Не удалось получить данные о маршруте.");
    }

    if (routePoints.length === 2) {
        directions.clear(); 
        directions.carRoute({
            points: routePoints,
        });
    }
}

function downloadRouteFile(content) {
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "routes.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

calculateRouteButton.addEventListener('click', fetchRouteForWeek);