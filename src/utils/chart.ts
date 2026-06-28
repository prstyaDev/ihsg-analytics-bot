import axios from 'axios';

const QUICKCHART_URL = 'https://quickchart.io/chart';

export async function generateChart(symbol: string, historyData: any[]): Promise<Buffer> {
  if (!historyData || historyData.length === 0) {
    throw new Error('Data historis tidak tersedia atau kosong.');
  }

  const sortedData = [...historyData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const labels = sortedData.map((d: any) => d.date);
  const dataPoints = sortedData.map((d: any) => d.close);

  const chartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `Harga Penutupan ${symbol.toUpperCase()}`,
        data: dataPoints,
        borderColor: '#00FF00',
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        borderWidth: 2,
        pointRadius: 2,
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          labels: {
            color: '#FFFFFF',
            font: { size: 14, family: 'Arial' }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#A0A0A0', maxTicksLimit: 15 },
          grid: { color: '#333333' }
        },
        y: {
          ticks: { color: '#A0A0A0' },
          grid: { color: '#333333' }
        }
      }
    }
  };

  const response = await axios.get(QUICKCHART_URL, {
    params: {
      c: JSON.stringify(chartConfig),
      width: 800,
      height: 400,
      backgroundColor: '#121212'
    },
    responseType: 'arraybuffer',
    timeout: 10000
  });

  return Buffer.from(response.data);
}
