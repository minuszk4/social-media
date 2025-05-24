// handle.js
export const handlePaste = (e, setMediaPreviews, setMediaFiles, setNewComment) => {
    const clipboardItems = e.clipboardData.items;
    let hasText = false;

    for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        
        if (item.type.startsWith("image/")) {
            // Handle image paste
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaPreviews((prevPreviews) => [...prevPreviews, reader.result]);
                setMediaFiles((prevFiles) => [...prevFiles, file]);
            };
            reader.readAsDataURL(file);
        } else if (item.type === "text/plain") {
            // Handle text paste
            hasText = true;
        }
    }

    if (!hasText) {
        // Prevent default and handle text-only paste if no image is present
        const text = e.clipboardData.getData("text/plain");
        setNewComment((prevComment) => prevComment + text);  // Append the text to the comment input
    }
};

export const handlePasteTextOnly = (e, setNewComment) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    setNewComment((prevComment) => prevComment + text);  
};
export const handlePasteImg = (e, setForm) => {
    e.preventDefault();
  
    const clipboardData = e.clipboardData || window.clipboardData;
    const items = clipboardData.items;
  
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
  
      if (item.kind === "file") {
        const file = item.getAsFile();
        const fileType = file.type.split("/")[0]; // "image" or "video"
  
        if (fileType === "image" || fileType === "video") {
          // Update the form state to include the new file
          setForm((prevForm) => ({
            ...prevForm,
            files: [...prevForm.files, file],
          }));
        }
      }
    }
};
  
// handle.js
export const handlePasteMess = (e, setSelectedImage, setNewMessage) => {
    e.preventDefault(); // Prevent default paste behavior
    const clipboardItems = e.clipboardData.items;

    for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];

        if (item.type.startsWith("image/")) {
            // Handle image paste
            const file = item.getAsFile();
            if (file) {
                setSelectedImage(file); 
            }
        } else if (item.type === "text/plain") {
            item.getAsString((text) => {
                setNewMessage((prev) => prev + text); 
            });
        }
    }
};