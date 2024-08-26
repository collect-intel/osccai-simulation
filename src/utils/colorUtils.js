export const generateColor = (index, total) => {
  const hue = (index / total) * 360;
  return `hsl(${hue}, 70%, 50%)`;
};