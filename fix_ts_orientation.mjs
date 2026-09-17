import fs from 'fs';
let code = fs.readFileSync('src/components/VideoPlayer.tsx', 'utf8');

const oldFunc = `  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
        // Ép xoay ngang màn hình trên điện thoại
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // Trả lại xoay dọc
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.log('Fullscreen error:', err);
    }
  };`;

const newFunc = `  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
        // @ts-ignore
        if (screen.orientation && screen.orientation.lock) {
          // @ts-ignore
          await screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // @ts-ignore
        if (screen.orientation && screen.orientation.unlock) {
          // @ts-ignore
          screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.log('Fullscreen error:', err);
    }
  };`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/components/VideoPlayer.tsx', code);
