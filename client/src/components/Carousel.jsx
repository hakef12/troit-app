export default function Carousel({ items }) {
  if (!items.length) return null;
  // Duplicamos la lista una vez para que el loop sea perfectamente continuo,
  // igual que el ticker del navbar.
  const loopItems = [...items, ...items];

  return (
    <div className="carousel">
      <div className="carousel-track">
        {loopItems.map((item, i) => (
          <div className="carousel-slide" key={i}>
            <img src={item.src} alt={item.alt} />
            {item.caption && <span className="carousel-caption">{item.caption}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
