let isAlreadyShuttingDown = false;

export default async function handleShutdown(
  signal: string,
  callback: () => Promise<void>,
  errCallback: (error: Error) => void,
) {
  if (isAlreadyShuttingDown) return;

  isAlreadyShuttingDown = true;
  let exitCode = 0;
  console.log(`Received ${signal}, shutting down...`);

  try {
    await callback();
  } catch (err) {
    exitCode = 1;
    errCallback(err as Error);
  } finally {
    console.log(`Exited with code ${exitCode}`);
    process.exit(exitCode);
  }
}
