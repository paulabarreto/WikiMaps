exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('favorites', function(table) {
            //table.increments('id');, add this, drop old table and then new table
            table.increments('id');
            table.integer('user_id').unsigned();
            table.foreign('user_id').references("id").inTable("users");
            table.integer('map_id').unsigned();
            table.foreign('map_id').references("id").inTable("maps");
        })
    ])
};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.dropTable('favorites')
    ])
};