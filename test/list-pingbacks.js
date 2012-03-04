print('pingbacks:');
db.pingbacks.find().forEach(printjson);
print();
print('comments:');
db.comments.find().forEach(printjson);
