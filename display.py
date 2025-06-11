import sys
import pyautogui
from PyQt5.QtCore import Qt, QUrl, QPoint, QRect, QTimer
from PyQt5.QtGui import QPixmap
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QLabel,
    QWidget, QPushButton, QHBoxLayout
)
from PyQt5.QtWidgets import QGraphicsDropShadowEffect, QVBoxLayout
from PyQt5.QtWebEngineWidgets import QWebEngineView

X, Y = 1950, 400  # Initial window position
INIT_WIDTH, INIT_HEIGHT = 600, 535
TOOLBAR_HEIGHT = 35

class DraggableToolbar(QWidget):
    def __init__(self, parent):
        super().__init__(parent)
        self.parent_window = parent
        self.drag_pos = None
        self.resize_mode = None
        self.resize_start_pos = None
        self.resize_start_geometry = None
        
        # Set toolbar styling
        self.setStyleSheet("""
            QWidget {
                background-color: rgba(50, 50, 50, 0.8);
                border-bottom: 1px solid rgba(100, 100, 100, 0.5);
            }
        """)
        
        # Create horizontal layout for toolbar items
        layout = QHBoxLayout(self)
        layout.setContentsMargins(10, 5, 10, 5)
        
        # # Title label
        # self.title_label = QLabel("", self)
        # self.title_label.setStyleSheet("color: white; font-weight: bold;")
        # layout.addWidget(self.title_label)
        
        # Spacer
        layout.addStretch()
        
        # Reset size button
        self.reset_button = QPushButton("⌂", self)
        self.reset_button.setFixedSize(25, 25)
        self.reset_button.setStyleSheet("""
            QPushButton {
                background-color: rgba(255, 255, 255, 0.7);
                border: none;
                border-radius: 12px;
                font-size: 14px;
                color: black;
            }
            QPushButton:hover {
                background-color: rgba(200, 200, 200, 0.9);
            }
        """)
        self.reset_button.clicked.connect(self.parent_window.reset_size)
        layout.addWidget(self.reset_button)
        
        # Hide button
        self.hide_button = QPushButton("👁", self)
        self.hide_button.setFixedSize(25, 25)
        self.hide_button.setStyleSheet("""
            QPushButton {
                background-color: rgba(255, 255, 255, 0.7);
                border: none;
                border-radius: 12px;
                font-size: 12px;
                color: black;
            }
            QPushButton:hover {
                background-color: rgba(200, 200, 200, 0.9);
            }
        """)
        self.hide_button.clicked.connect(self.parent_window.hide_temporarily)
        layout.addWidget(self.hide_button)
        
        # Refresh button in toolbar
        self.refresh_button = QPushButton("↻", self)
        self.refresh_button.setFixedSize(25, 25)
        self.refresh_button.setStyleSheet("""
            QPushButton {
                background-color: rgba(255, 255, 255, 0.7);
                border: none;
                border-radius: 12px;
                font-size: 14px;
                color: black;
            }
            QPushButton:hover {
                background-color: rgba(200, 200, 200, 0.9);
            }
        """)
        self.refresh_button.clicked.connect(self.parent_window.refresh_browser)
        layout.addWidget(self.refresh_button)
        
        # Close button
        self.close_button = QPushButton("×", self)
        self.close_button.setFixedSize(25, 25)
        self.close_button.setStyleSheet("""
            QPushButton {
                background-color: rgba(255, 100, 100, 0.7);
                border: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                color: white;
            }
            QPushButton:hover {
                background-color: rgba(255, 50, 50, 0.9);
            }
        """)
        self.close_button.clicked.connect(self.parent_window.close)
        layout.addWidget(self.close_button)
        
        # Enable mouse tracking for cursor updates
        self.setMouseTracking(True)

    def enterEvent(self, event):
        """Enable mouse tracking when mouse enters toolbar"""
        self.setMouseTracking(True)
        
    def leaveEvent(self, event):
        """Reset cursor when mouse leaves toolbar"""
        self.setCursor(Qt.ArrowCursor)
        
    def mouseMoveEvent(self, event):
        if event.buttons() & Qt.LeftButton:
            if self.resize_mode and self.resize_start_pos:
                # Handle resizing
                delta = event.globalPos() - self.resize_start_pos
                new_geometry = QRect(self.resize_start_geometry)
                
                if "left" in self.resize_mode:
                    new_geometry.setLeft(new_geometry.left() + delta.x())
                if "right" in self.resize_mode:
                    new_geometry.setRight(new_geometry.right() + delta.x())
                if "top" in self.resize_mode:
                    new_geometry.setTop(new_geometry.top() + delta.y())
                if "bottom" in self.resize_mode:
                    new_geometry.setBottom(new_geometry.bottom() + delta.y())
                
                # Enforce minimum size
                min_width, min_height = 300, 200
                if new_geometry.width() >= min_width and new_geometry.height() >= min_height:
                    self.parent_window.setGeometry(new_geometry)
                    
            elif self.drag_pos:
                # Handle normal dragging
                self.parent_window.move(event.globalPos() - self.drag_pos)
        else:
            # Update cursor when not dragging
            self.update_cursor(event)
        event.accept()
        
    def update_cursor(self, event):
        """Update cursor based on position for visual feedback"""
        pos = event.pos()
        rect = self.rect()
        edge_margin = 10
        
        left_edge = pos.x() <= edge_margin
        right_edge = pos.x() >= rect.width() - edge_margin
        top_edge = pos.y() <= edge_margin
        bottom_edge = pos.y() >= rect.height() - edge_margin
        
        if left_edge and top_edge:
            self.setCursor(Qt.SizeFDiagCursor)
        elif right_edge and top_edge:
            self.setCursor(Qt.SizeBDiagCursor)
        elif left_edge and bottom_edge:
            self.setCursor(Qt.SizeBDiagCursor)
        elif right_edge and bottom_edge:
            self.setCursor(Qt.SizeFDiagCursor)
        elif left_edge or right_edge:
            self.setCursor(Qt.SizeHorCursor)
        elif top_edge or bottom_edge:
            self.setCursor(Qt.SizeVerCursor)
        else:
            self.setCursor(Qt.ArrowCursor)

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            # Check if we're near edges for resizing
            pos = event.pos()
            rect = self.rect()
            edge_margin = 10
            
            # Determine resize mode based on cursor position
            left_edge = pos.x() <= edge_margin
            right_edge = pos.x() >= rect.width() - edge_margin
            top_edge = pos.y() <= edge_margin
            bottom_edge = pos.y() >= rect.height() - edge_margin
            
            if left_edge and top_edge:
                self.resize_mode = "top_left"
            elif right_edge and top_edge:
                self.resize_mode = "top_right"
            elif left_edge and bottom_edge:
                self.resize_mode = "bottom_left"
            elif right_edge and bottom_edge:
                self.resize_mode = "bottom_right"
            elif left_edge:
                self.resize_mode = "left"
            elif right_edge:
                self.resize_mode = "right"
            elif top_edge:
                self.resize_mode = "top"
            elif bottom_edge:
                self.resize_mode = "bottom"
            else:
                self.resize_mode = None
                
            if self.resize_mode:
                self.resize_start_pos = event.globalPos()
                self.resize_start_geometry = self.parent_window.geometry()
            else:
                # Normal drag mode
                self.drag_pos = event.globalPos() - self.parent_window.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event):
        if event.buttons() & Qt.LeftButton:
            if self.resize_mode and self.resize_start_pos:
                # Handle resizing
                delta = event.globalPos() - self.resize_start_pos
                new_geometry = QRect(self.resize_start_geometry)
                
                if "left" in self.resize_mode:
                    new_geometry.setLeft(new_geometry.left() + delta.x())
                if "right" in self.resize_mode:
                    new_geometry.setRight(new_geometry.right() + delta.x())
                if "top" in self.resize_mode:
                    new_geometry.setTop(new_geometry.top() + delta.y())
                if "bottom" in self.resize_mode:
                    new_geometry.setBottom(new_geometry.bottom() + delta.y())
                
                # Enforce minimum size
                min_width, min_height = 300, 200
                if new_geometry.width() >= min_width and new_geometry.height() >= min_height:
                    self.parent_window.setGeometry(new_geometry)
                    
            elif self.drag_pos:
                # Handle normal dragging
                self.parent_window.move(event.globalPos() - self.drag_pos)
            event.accept()

    def mouseReleaseEvent(self, event):
        self.drag_pos = None
        self.resize_mode = None
        self.resize_start_pos = None
        self.resize_start_geometry = None
        event.accept()
        
    def mouseMoveEvent_cursor_update(self, event):
        """Update cursor based on position for visual feedback"""
        pos = event.pos()
        rect = self.rect()
        edge_margin = 10
        
        left_edge = pos.x() <= edge_margin
        right_edge = pos.x() >= rect.width() - edge_margin
        top_edge = pos.y() <= edge_margin
        bottom_edge = pos.y() >= rect.height() - edge_margin
        
        if left_edge and top_edge:
            self.setCursor(Qt.SizeFDiagCursor)
        elif right_edge and top_edge:
            self.setCursor(Qt.SizeBDiagCursor)
        elif left_edge and bottom_edge:
            self.setCursor(Qt.SizeBDiagCursor)
        elif right_edge and bottom_edge:
            self.setCursor(Qt.SizeFDiagCursor)
        elif left_edge or right_edge:
            self.setCursor(Qt.SizeHorCursor)
        elif top_edge or bottom_edge:
            self.setCursor(Qt.SizeVerCursor)
        else:
            self.setCursor(Qt.ArrowCursor)

class BrowserOverlay(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setGeometry(X, Y, INIT_WIDTH, INIT_HEIGHT)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        self.setWindowOpacity(0.9)

        # Create central widget
        central_widget = QWidget(self)
        self.setCentralWidget(central_widget)
        
        # Create main layout
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Create draggable toolbar
        self.toolbar = DraggableToolbar(self)
        self.toolbar.setFixedHeight(TOOLBAR_HEIGHT)
        main_layout.addWidget(self.toolbar)

        # Background label for browser area
        self.bg_label = QLabel(self)
        self.bg_label.setScaledContents(True)

        # Web view
        self.browser = QWebEngineView(self)
        self.browser.setUrl(QUrl("http://localhost:5173"))
        main_layout.addWidget(self.browser)

        # Timer for hide functionality
        self.hide_timer = QTimer()
        self.hide_timer.setSingleShot(True)
        self.hide_timer.timeout.connect(self.show_window)

        # Initial layout sync
        self.update_layout()

    def reset_size(self):
        """Reset window to original size and position"""
        self.setGeometry(X, Y, INIT_WIDTH, INIT_HEIGHT)
        self.update_layout()

    def hide_temporarily(self):
        """Hide the window for 2 seconds, then show it again"""
        self.hide()
        self.hide_timer.start(2000)  # 2000 milliseconds = 2 seconds

    def show_window(self):
        """Show the window again after hiding"""
        self.show()
        # Update layout after showing to refresh background
        self.update_layout()

    def update_layout(self):
        width = self.width()
        height = self.height()

        # Capture and update background for the browser area only
        browser_y = self.y() + TOOLBAR_HEIGHT
        browser_height = height - TOOLBAR_HEIGHT
        
        if browser_height > 0:
            screenshot = pyautogui.screenshot(region=(self.x(), browser_y, width, browser_height))
            screenshot = screenshot.convert("RGB")
            screenshot.save("bg_capture.jpg")
            self.bg_label.setPixmap(QPixmap("bg_capture.jpg"))
            # Position background label behind browser
            self.bg_label.setGeometry(0, TOOLBAR_HEIGHT, width, browser_height)
            self.bg_label.lower()  # Send to back

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.update_layout()

    def moveEvent(self, event):
        super().moveEvent(event)
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