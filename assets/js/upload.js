// Upload page functionality
class VideoUploader {
  constructor() {
    this.isSubmitting = false
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.setupFormValidation()
  }

  setupEventListeners() {
    const form = document.getElementById("uploadForm")
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault()
        this.handleSubmit()
      })
    }

    // Real-time URL validation
    const driveUrlInput = document.getElementById("driveUrl")
    if (driveUrlInput) {
      driveUrlInput.addEventListener("input", (e) => {
        this.validateDriveUrl(e.target.value)
      })

      driveUrlInput.addEventListener("blur", (e) => {
        this.processDriveUrl(e.target.value)
      })
    }

    // Auto-generate thumbnail from Drive URL
    const thumbnailInput = document.getElementById("thumbnailUrl")
    if (thumbnailInput && driveUrlInput) {
      driveUrlInput.addEventListener("change", () => {
        this.autoGenerateThumbnail(driveUrlInput.value, thumbnailInput)
      })
    }

    // Form auto-save (draft functionality)
    this.setupAutoSave()
  }

  setupFormValidation() {
    const inputs = document.querySelectorAll(".form-input, .form-textarea")
    inputs.forEach((input) => {
      input.addEventListener("blur", () => {
        this.validateField(input)
      })

      input.addEventListener("input", () => {
        this.clearFieldError(input)
      })
    })
  }

  setupAutoSave() {
    const form = document.getElementById("uploadForm")
    if (!form) return

    // Load saved draft
    this.loadDraft()

    // Save draft on input
    const inputs = form.querySelectorAll("input, textarea")
    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        this.saveDraft()
      })
    })
  }

  validateDriveUrl(url) {
    const driveUrlInput = document.getElementById("driveUrl")
    const helpText = driveUrlInput?.parentNode.querySelector(".form-help")

    if (!url) {
      this.updateHelpText(helpText, "Paste the shareable link from Google Drive", "neutral")
      return false
    }

    if (this.isValidGoogleDriveUrl(url)) {
      this.updateHelpText(helpText, "✓ Valid Google Drive URL", "success")
      return true
    } else if (this.isValidYouTubeUrl(url)) {
      this.updateHelpText(helpText, "✓ Valid YouTube URL", "success")
      return true
    } else if (this.isValidDirectVideoUrl(url)) {
      this.updateHelpText(helpText, "✓ Valid video URL", "success")
      return true
    } else {
      this.updateHelpText(helpText, "⚠ Please enter a valid Google Drive, YouTube, or direct video URL", "error")
      return false
    }
  }

  updateHelpText(element, text, type) {
    if (!element) return

    element.textContent = text
    element.className = `form-help form-help-${type}`
  }

  async processDriveUrl(url) {
    if (!this.isValidGoogleDriveUrl(url)) return

    try {
      // Extract file ID from Google Drive URL
      const fileId = this.extractGoogleDriveFileId(url)
      if (!fileId) return

      // Try to get file metadata (this would require Google Drive API in a real implementation)
      // For now, we'll just extract what we can from the URL
      this.showProcessingIndicator(true)

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Auto-fill thumbnail if not provided
      const thumbnailInput = document.getElementById("thumbnailUrl")
      if (thumbnailInput && !thumbnailInput.value) {
        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`
        thumbnailInput.value = thumbnailUrl
      }

      this.showProcessingIndicator(false)
      this.showNotification("Drive URL processed successfully!", "success")
    } catch (error) {
      console.error("Error processing Drive URL:", error)
      this.showProcessingIndicator(false)
      this.showNotification("Failed to process Drive URL", "error")
    }
  }

  autoGenerateThumbnail(driveUrl, thumbnailInput) {
    if (!this.isValidGoogleDriveUrl(driveUrl) || thumbnailInput.value) return

    const fileId = this.extractGoogleDriveFileId(driveUrl)
    if (fileId) {
      thumbnailInput.value = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`
    }
  }

  async handleSubmit() {
    if (this.isSubmitting) return

    const formData = this.getFormData()
    if (!this.validateForm(formData)) {
      return
    }

    this.isSubmitting = true
    this.updateSubmitButton(true)

    try {
      await this.saveVideo(formData)
      this.showNotification("Video added successfully!", "success")
      this.clearDraft()

      // Redirect to catalog after short delay
      setTimeout(() => {
        window.location.href = "index.html"
      }, 1500)
    } catch (error) {
      console.error("Error saving video:", error)
      this.showNotification("Failed to save video. Please try again.", "error")
    } finally {
      this.isSubmitting = false
      this.updateSubmitButton(false)
    }
  }

  getFormData() {
    return {
      driveUrl: document.getElementById("driveUrl")?.value.trim() || "",
      title: document.getElementById("videoTitle")?.value.trim() || "",
      description: document.getElementById("videoDescription")?.value.trim() || "",
      thumbnailUrl: document.getElementById("thumbnailUrl")?.value.trim() || "",
    }
  }

  validateForm(data) {
    let isValid = true
    const errors = []

    // Validate Drive URL
    if (!data.driveUrl) {
      this.showFieldError("driveUrl", "Video URL is required")
      errors.push("Video URL is required")
      isValid = false
    } else if (!this.validateDriveUrl(data.driveUrl)) {
      this.showFieldError("driveUrl", "Please enter a valid video URL")
      errors.push("Invalid video URL")
      isValid = false
    }

    // Validate title
    if (!data.title) {
      this.showFieldError("videoTitle", "Title is required")
      errors.push("Title is required")
      isValid = false
    } else if (data.title.length < 3) {
      this.showFieldError("videoTitle", "Title must be at least 3 characters long")
      errors.push("Title too short")
      isValid = false
    } else if (data.title.length > 100) {
      this.showFieldError("videoTitle", "Title must be less than 100 characters")
      errors.push("Title too long")
      isValid = false
    }

    // Validate description (optional but with limits)
    if (data.description && data.description.length > 500) {
      this.showFieldError("videoDescription", "Description must be less than 500 characters")
      errors.push("Description too long")
      isValid = false
    }

    // Validate thumbnail URL (optional but must be valid if provided)
    if (data.thumbnailUrl && !this.isValidImageUrl(data.thumbnailUrl)) {
      this.showFieldError("thumbnailUrl", "Please enter a valid image URL")
      errors.push("Invalid thumbnail URL")
      isValid = false
    }

    if (!isValid) {
      this.showNotification(`Please fix the following errors: ${errors.join(", ")}`, "error")
    }

    return isValid
  }

  async saveVideo(data) {
    // Generate unique ID
    const videoId = this.generateVideoId()

    // Create video object
    const video = {
      id: videoId,
      title: data.title,
      description: data.description || "",
      thumbnail: data.thumbnailUrl || this.getDefaultThumbnail(),
      videoUrl: this.convertToEmbedUrl(data.driveUrl),
      driveUrl: data.driveUrl,
      dateAdded: new Date().toISOString(),
      addedBy: "user",
    }

    // Save to localStorage
    const existingVideos = JSON.parse(localStorage.getItem("userVideos") || "[]")
    existingVideos.push(video)
    localStorage.setItem("userVideos", JSON.stringify(existingVideos))

    // Update video count in localStorage for stats
    const videoCount = existingVideos.length
    localStorage.setItem("userVideoCount", videoCount.toString())

    return video
  }

  convertToEmbedUrl(url) {
    if (this.isValidGoogleDriveUrl(url)) {
      const fileId = this.extractGoogleDriveFileId(url)
      return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url
    }

    if (this.isValidYouTubeUrl(url)) {
      // Convert YouTube watch URL to embed URL
      const videoId = this.extractYouTubeVideoId(url)
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url
    }

    return url
  }

  generateVideoId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getDefaultThumbnail() {
    return "/placeholder.svg?height=200&width=300&text=Video"
  }

  // URL validation methods
  isValidGoogleDriveUrl(url) {
    return url && url.includes("drive.google.com") && url.includes("/file/d/")
  }

  isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    return youtubeRegex.test(url)
  }

  isValidDirectVideoUrl(url) {
    if (!url) return false
    try {
      new URL(url)
      const videoExtensions = [".mp4", ".webm", ".ogg", ".avi", ".mov", ".wmv", ".flv", ".mkv"]
      return videoExtensions.some((ext) => url.toLowerCase().includes(ext))
    } catch {
      return false
    }
  }

  isValidImageUrl(url) {
    if (!url) return true // Optional field
    try {
      new URL(url)
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
      return imageExtensions.some((ext) => url.toLowerCase().includes(ext)) || url.includes("thumbnail")
    } catch {
      return false
    }
  }

  extractGoogleDriveFileId(url) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  extractYouTubeVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  // UI Helper methods
  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId)
    if (!field) return

    // Remove existing error
    this.clearFieldError(field)

    // Add error styling
    field.classList.add("field-error")

    // Add error message
    const errorElement = document.createElement("div")
    errorElement.className = "field-error-message"
    errorElement.textContent = message
    field.parentNode.appendChild(errorElement)
  }

  clearFieldError(field) {
    field.classList.remove("field-error")
    const errorMessage = field.parentNode.querySelector(".field-error-message")
    if (errorMessage) {
      errorMessage.remove()
    }
  }

  validateField(field) {
    const value = field.value.trim()
    const fieldId = field.id

    switch (fieldId) {
      case "driveUrl":
        if (value && !this.validateDriveUrl(value)) {
          this.showFieldError(fieldId, "Please enter a valid video URL")
          return false
        }
        break
      case "videoTitle":
        if (value && value.length < 3) {
          this.showFieldError(fieldId, "Title must be at least 3 characters long")
          return false
        }
        break
      case "thumbnailUrl":
        if (value && !this.isValidImageUrl(value)) {
          this.showFieldError(fieldId, "Please enter a valid image URL")
          return false
        }
        break
    }

    this.clearFieldError(field)
    return true
  }

  updateSubmitButton(isLoading) {
    const button = document.querySelector(".submit-btn")
    if (!button) return

    if (isLoading) {
      button.disabled = true
      button.innerHTML = `
        <div class="loading-spinner-small"></div>
        Adding Video...
      `
    } else {
      button.disabled = false
      button.innerHTML = "Add Video"
    }
  }

  showProcessingIndicator(show) {
    const driveUrlInput = document.getElementById("driveUrl")
    if (!driveUrlInput) return

    if (show) {
      driveUrlInput.classList.add("processing")
    } else {
      driveUrlInput.classList.remove("processing")
    }
  }

  showNotification(message, type = "success") {
    // Remove existing notification
    const existingNotification = document.querySelector(".notification")
    if (existingNotification) {
      existingNotification.remove()
    }

    // Create notification
    const notification = document.createElement("div")
    notification.className = `notification notification-${type}`
    notification.textContent = message

    // Add to page
    document.body.appendChild(notification)

    // Animate in
    setTimeout(() => {
      notification.classList.add("show")
    }, 100)

    // Remove after delay
    setTimeout(
      () => {
        notification.classList.remove("show")
        setTimeout(() => {
          notification.remove()
        }, 300)
      },
      type === "error" ? 5000 : 3000,
    )
  }

  // Draft functionality
  saveDraft() {
    const formData = this.getFormData()
    localStorage.setItem("videoDraft", JSON.stringify(formData))
  }

  loadDraft() {
    const draft = localStorage.getItem("videoDraft")
    if (!draft) return

    try {
      const data = JSON.parse(draft)

      // Fill form with draft data
      if (data.driveUrl) document.getElementById("driveUrl").value = data.driveUrl
      if (data.title) document.getElementById("videoTitle").value = data.title
      if (data.description) document.getElementById("videoDescription").value = data.description
      if (data.thumbnailUrl) document.getElementById("thumbnailUrl").value = data.thumbnailUrl

      // Show draft indicator
      this.showNotification("Draft restored", "info")
    } catch (error) {
      console.error("Error loading draft:", error)
    }
  }

  clearDraft() {
    localStorage.removeItem("videoDraft")
  }
}

// Initialize uploader when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new VideoUploader()
})

// Add keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + Enter to submit form
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault()
    const form = document.getElementById("uploadForm")
    if (form) {
      form.dispatchEvent(new Event("submit"))
    }
  }

  // Escape to go back
  if (e.key === "Escape") {
    window.location.href = "index.html"
  }
})
