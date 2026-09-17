import fs from 'fs';

// 1. Read current page.tsx
let clientCode = fs.readFileSync('src/app/page.tsx', 'utf8');

// 2. Modify to accept initialData
clientCode = clientCode.replace('export default function Home() {', 'export default function HomePageClient({ initialSeries = [] }: { initialSeries: Series[] }) {');
clientCode = clientCode.replace('const [seriesList, setSeriesList] = useState<Series[]>([]);', 'const [seriesList, setSeriesList] = useState<Series[]>(initialSeries);');
clientCode = clientCode.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(false);'); // No longer loading initially

// Replace the specific useEffect fetch logic
const fetchLogic = `useEffect(() => {
    fetch('/api/series')
      .then((res) => res.json())
      .then((data) => {
        setSeriesList(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);`;

const newFetchLogic = `useEffect(() => {
    // Nếu chưa có data ban đầu, mới tải qua API
    if (initialSeries.length === 0) {
      setLoading(true);
      fetch('/api/series')
        .then((res) => res.json())
        .then((data) => {
          setSeriesList(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setSeriesList(initialSeries);
    }
  }, [initialSeries]);`;

clientCode = clientCode.replace(fetchLogic, newFetchLogic);

// Write it to HomePageClient.tsx
fs.writeFileSync('src/app/HomePageClient.tsx', clientCode);

// 3. Create the new Server Component page.tsx
const serverCode = `import HomePageClient from './HomePageClient';
import fs from 'fs';
import path from 'path';

export const revalidate = 0; // Dynamic server rendering to always get latest videos

export default async function Home() {
  let series = [];
  try {
    const dbPath = path.join(process.cwd(), 'src/data/database.json');
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      series = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read db:', err);
  }

  return <HomePageClient initialSeries={series} />;
}
`;
fs.writeFileSync('src/app/page.tsx', serverCode);
