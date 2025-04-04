import { SIDEKICK_URL } from '@/helpers/constants';
import pkg from '@/../package.json';

export function useReportDownload() {
  const isDownloadingVotes = ref(false);

  async function downloadFile(blob: Blob, fileName: string) {
    const href = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href,
      style: 'display:none',
      download: fileName
    });
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(href);
    a.remove();
  }

  async function downloadVotes(proposalId: string | number) {
    isDownloadingVotes.value = true;

    try {
      const response = await fetch(`${SIDEKICK_URL}/api/votes/${proposalId}`, {
        method: 'POST'
      });

      if (response.status !== 200) {
        const data = await response.json();

        // NOTE: This is a temporary workaround until the API is updated to return a proper error object
        if (data.error) {
          throw new Error(data.error.message);
        } else {
          throw new Error('PENDING_GENERATION');
        }
      }

      downloadFile(await response.blob(), `${pkg.name}-report-${proposalId}`);
      return true;
    } finally {
      isDownloadingVotes.value = false;
    }
  }

  return {
    downloadVotes,
    isDownloadingVotes
  };
}
