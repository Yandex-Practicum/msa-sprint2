import os

from grpc_tools import protoc

def generate_grpc_code():
    protoc.main([
        'grpc_tools.protoc',
        '-I./proto',
        '--python_out=proto',
        '--grpc_python_out=proto',
        './proto/booking.proto'
    ])

    fix_imports('proto/booking_pb2.py')
    fix_imports('proto/booking_pb2_grpc.py')
    print("gRPC code generated successfully")

def fix_imports(file_path):
    """Исправляем импорты в сгенерированных файлах"""
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Заменяем абсолютные импорты на относительные
        content = content.replace(
            'import booking_pb2 as booking__pb2',
            'from . import booking_pb2 as booking__pb2'
        )

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"Fixed imports in {file_path}")

if __name__ == '__main__':
    generate_grpc_code()