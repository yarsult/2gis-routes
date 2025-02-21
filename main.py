import sys
import os
import threading
import http.server
import socketserver
from PyQt6.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QMessageBox
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtCore import QUrl

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_FOLDER = os.path.join(os.path.expanduser("~"), "Downloads")


class ServerThread(threading.Thread):

    def run(self):
        os.chdir(DIRECTORY)
        handler = http.server.SimpleHTTPRequestHandler
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print(f"Сервер запущен на http://localhost:{PORT}")
            httpd.serve_forever()


class MapApp(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("2GIS Map Viewer")
        self.setGeometry(100, 100, 1024, 768)

        layout = QVBoxLayout()
        self.setLayout(layout)

        self.browser = QWebEngineView()
        self.browser.setUrl(QUrl(f"http://localhost:{PORT}/map.html"))

        self.browser.page().profile().downloadRequested.connect(self.handle_download)

        self.reload_button = QPushButton("Обновить страницу")
        self.reload_button.clicked.connect(self.browser.reload)

        layout.addWidget(self.browser)
        layout.addWidget(self.reload_button)

    def handle_download(self, download):
        file_path = os.path.join(DOWNLOAD_FOLDER, "routes.txt")

        download.setDownloadDirectory(DOWNLOAD_FOLDER)
        download.setDownloadFileName("routes.txt")
        download.accept()

        self.show_message(f"Файл загружен: {file_path}")

    def show_message(self, message):
        msg_box = QMessageBox()
        msg_box.setWindowTitle("Скачивание завершено")
        msg_box.setText(message)
        msg_box.setIcon(QMessageBox.Icon.Information)
        msg_box.exec()


if __name__ == "__main__":
    server = ServerThread()
    server.daemon = True
    server.start()

    app = QApplication(sys.argv)
    window = MapApp()
    window.show()
    sys.exit(app.exec())
