import sys
from PyQt6.QtWidgets import QApplication, QWidget, QGraphicsDropShadowEffect
from PyQt6.QtGui import QColor, QPainter, QBrush
from PyQt6.QtCore import Qt, QRect, QSize


class RoundedWindow(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Rounded Black Window")
        self.resize(300, 300)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Window)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)

        # Add drop shadow
        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(20)
        shadow.setXOffset(0)
        shadow.setYOffset(0)
        shadow.setColor(QColor(0, 0, 0, 160))
        self.setGraphicsEffect(shadow)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        rect = QRect(10, 10, self.width() - 20, self.height() - 20)
        brush = QBrush(QColor(0, 0, 0))  # black background
        painter.setBrush(brush)
        painter.setPen(Qt.PenStyle.NoPen)

        painter.drawRoundedRect(rect, 20, 20)  # 20 px corner radius


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = RoundedWindow()
    window.show()
    sys.exit(app.exec())
