// utils/mediaUtils.js
export const MAX_MEDIA = 4;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const handleMediaChange = (e, mediaFiles, setMediaFiles, setMediaPreviews, setError) => {
  const selected = Array.from(e.target.files);
  const total = selected.length + mediaFiles.length;

  if (total > MAX_MEDIA) {
    setError(`Bạn chỉ có thể đăng tối đa ${MAX_MEDIA} ảnh hoặc video.`);
    return;
  }

  for (const file of selected) {
    if (file.size > MAX_FILE_SIZE) {
      setError('Kích thước tệp tối đa là 5MB.');
      return;
    }
  }

  setMediaFiles((prev) => [...prev, ...selected]);
  setMediaPreviews((prev) => [
    ...prev,
    ...selected.map((file) => URL.createObjectURL(file)),
  ]);
  setError('');
};

export const removeMedia = (index, mediaFiles, setMediaFiles, setMediaPreviews) => {
  setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
};
