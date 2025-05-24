import React, { useState } from 'react';
import '../css/EditPost.css';
import { handlePasteImg } from '../utils/handle';

const EditPost = ({ postData, onCancel, onSuccess }) => {
  const [form, setForm] = useState({
    text: postData.content,
    files: [],
    keepMedia: postData.media.map((m) => m.media_id),
    privacy_level: postData.privacy_level || "public",
  });
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const MAX_MEDIA = 4;

  const handleRemoveOldMedia = (media_id) => {
    setForm((prev) => ({
      ...prev,
      keepMedia: prev.keepMedia.filter((id) => id !== media_id),
    }));
  };

  const handleRemoveNewFile = (index) => {
    setForm((prev) => {
      const updated = [...prev.files];
      updated.splice(index, 1);
      return { ...prev, files: updated };
    });
  };

  const handleAddFiles = (e) => {
    const selected = Array.from(e.target.files);
    const total = selected.length + form.keepMedia.length + form.files.length;

    if (total > MAX_MEDIA) {
      setError(`Bạn chỉ có thể đăng tối đa ${MAX_MEDIA} ảnh hoặc video.`);
      return;
    }

    setForm((prev) => ({
      ...prev,
      files: [...prev.files, ...selected],
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("text", form.text);
    formData.append("keepMedia", JSON.stringify(form.keepMedia));
    formData.append("privacy", form.privacy_level);

    form.files.forEach((file) => formData.append("media", file));

    try {
      const res = await fetch(`http://localhost:5000/api/posts/${postData.post_id}`, {
        method: "PUT",
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess({ ...postData, content: form.text });
      } else {
        console.error(data.error || "Lỗi khi cập nhật bài viết.");
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Chỉnh sửa bài viết</h2>

        <form onSubmit={handleSubmit} className="edit-post-form">
          <textarea
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            rows={4}
            className="edit-post-textarea"
            placeholder="Chỉnh sửa nội dung bài viết..."
            onPaste={(e) => handlePasteImg(e, setForm)}
          />

          {error && <p className="error-text">{error}</p>}

          <label className="privacy-label">
            Quyền riêng tư:
            <select
              value={form.privacy}
              onChange={(e) => setForm({ ...form, privacy_level: e.target.value })}
              className="privacy-select"
            >
              <option value="public">Public</option>
              <option value="friends">Friends</option>
              <option value="private">Private</option>
            </select>
          </label>

          <div className="media-preview">
            {/* Old media (kept) */}
            {postData.media.map((m) =>
              form.keepMedia.includes(m.media_id) && (
                <div key={m.media_id} className="edit-media-item">
                  {m.media_type === "image" ? (
                    <img
                      src={m.media_url}
                      alt=""
                      className="media-thumb"
                      onClick={() => openModal(m.media_url)}
                    />
                  ) : (
                    <video src={m.media_url} controls className="media-thumb" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveOldMedia(m.media_id)}
                    className="remove-button-edit"
                  >
                    ×
                  </button>
                </div>
              )
            )}

            {/* New media */}
            {form.files.map((file, index) => (
              <div key={index} className="edit-media-item">
                {file.type.startsWith("image") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="media-thumb"
                    onClick={() => openModal(URL.createObjectURL(file))}
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(file)}
                    controls
                    className="media-thumb"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveNewFile(index)}
                  className="remove-button-edit"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleAddFiles}
            className="file-input"
          />

          <div className="button-group">
            <button type="submit" className="btn btn-primary">Lưu</button>
            <button type="button" onClick={onCancel} className="btn btn-secondary">Hủy</button>
          </div>
        </form>
      </div>

      {/* Modal for full-size image/video */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {selectedImage && selectedImage.endsWith('.mp4') ? (
              <video src={selectedImage} controls className="media-full-size" />
            ) : (
              <img src={selectedImage} alt="Full size" className="media-full-size" />
            )}
            <button className="close-modal" onClick={closeModal}>×</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default EditPost;
