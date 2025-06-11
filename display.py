import sys
import pyautogui
from PyQt5.QtCore import Qt, QUrl, QPoint, QRect
from PyQt5.QtGui import QPixmap
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QLabel,
    QWidget, QPushButton
)
from PyQt5.QtWidgets import QGraphicsDropShadowEffect, QVBoxLayout
from PyQt5.QtWebEngineWidgets import QWebEngineView

X, Y = 1950, 400  # Initial window position
INIT_WIDTH, INIT_HEIGHT = 600, 500

class DragOverlay(QWidget):
    def __init__(self, parent):
        super().__init__(parent)
        self.setStyleSheet("background: transparent;")
        
        self.setAttribute(Qt.WA_TransparentForMouseEvents, False)
        self.drag_pos = None

    def resizeEvent(self, event):
        self.setGeometry(0, 0, self.parent().width(), self.parent().height())

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.drag_pos = event.globalPos() - self.parent().frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event):
        if event.buttons() & Qt.LeftButton and self.drag_pos:
            self.parent().move(event.globalPos() - self.drag_pos)
            event.accept()

    def mouseReleaseEvent(self, event):
        self.drag_pos = None
        event.accept()

class BrowserOverlay(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setGeometry(X, Y, INIT_WIDTH, INIT_HEIGHT)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setWindowOpacity(0.9)

        # Background label
        self.bg_label = QLabel(self)
        self.bg_label.setScaledContents(True)

        # Web view
        self.browser = QWebEngineView(self)
        self.browser.setUrl(QUrl("http://localhost:5173"))

        # Refresh button
        self.refresh_button = QPushButton("↻", self)
        self.refresh_button.setStyleSheet("""
            QPushButton {
                background-color: rgba(255, 255, 255, 0.7);
                border: none;
                border-radius: 5px;
                font-size: 16px;
            }
            QPushButton:hover {
                background-color: rgba(200, 200, 200, 0.9);
            }
        """)
        self.refresh_button.clicked.connect(self.refresh_browser)

        # Drag overlay
        self.drag_overlay = DragOverlay(self)

        # Initial layout sync
        self.update_layout()

        

    def update_layout(self):
        width = self.width()
        height = self.height()

        # Capture and update background
        screenshot = pyautogui.screenshot(region=(self.x(), self.y(), width, height))
        screenshot = screenshot.convert("RGB")
        screenshot.save("bg_capture.jpg")
        self.bg_label.setPixmap(QPixmap("bg_capture.jpg"))
        self.bg_label.setGeometry(0, 0, width, height)

        # Resize other elements
        self.browser.setGeometry(0, 0, width, height)
        self.drag_overlay.setGeometry(0, 0, width, height)
        self.refresh_button.setGeometry(width - 40, 10, 30, 30)

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.update_layout()

    def refresh_browser(self):
        self.browser.reload()

if __name__ == "__main__":
    import os
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--disable-gpu"
    os.environ["QT_OPENGL"] = "software"


    app = QApplication(sys.argv)
    window = BrowserOverlay()
    window.show()
    sys.exit(app.exec_())
