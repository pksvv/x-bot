import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const data = {
    labels: ['Likes', 'Retweets', 'Replies', 'Views'],
    datasets: [
      {
        label: 'Thread Performance',
        data: [12, 19, 3, 5],
        backgroundColor: 'rgba(29, 161, 242, 0.8)',
        borderColor: 'rgba(29, 161, 242, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Twitter Thread Analytics',
      },
    },
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Twitter Thread Bot Dashboard</h1>
      <div style={{ width: '800px', height: '400px' }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}