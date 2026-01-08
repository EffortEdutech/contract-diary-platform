import React, { useEffect, useRef } from 'react';
import { generateStatusChartImage } from '../../../utils/reports/chartGenerators';

const BOQStatusChartPreview = ({ chart }) => {
  const imgRef = useRef(null);

  useEffect(() => {
    if (!chart || !chart.labels.length) return;

    generateStatusChartImage(
      chart.labels.map((l, i) => ({
        label: l,
        value: chart.values[i]
      }))
    ).then(img => {
      if (imgRef.current) {
        imgRef.current.src = img;
      }
    });
  }, [chart]);

  return (
    <div className="border mb-4 p-3">
      <h4 className="font-semibold mb-2">Completion Status</h4>
      <img ref={imgRef} alt="Status Chart" />
    </div>
  );
};

export default BOQStatusChartPreview;
