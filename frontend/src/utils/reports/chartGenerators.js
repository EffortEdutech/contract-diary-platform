import { PieChart, Pie, Cell } from 'recharts';
import { renderToStaticMarkup } from 'react-dom/server';
import html2canvas from 'html2canvas';

const COLORS = {
  Completed: '#10b981',
  'In Progress': '#f59e0b',
  'Not Started': '#6b7280'
};

export const generateStatusChartImage = async (statusData) => {
  const svg = (
    <svg width="400" height="300">
      <foreignObject width="100%" height="100%">
        <PieChart width={400} height={300}>
          <Pie
            data={statusData}
            cx={200}
            cy={150}
            outerRadius={100}
            dataKey="value"
          >
            {statusData.map((e, i) => (
              <Cell key={i} fill={COLORS[e.name]} />
            ))}
          </Pie>
        </PieChart>
      </foreignObject>
    </svg>
  );

  const html = renderToStaticMarkup(svg);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const canvas = await html2canvas(container);
  document.body.removeChild(container);

  return canvas.toDataURL('image/png');
};
