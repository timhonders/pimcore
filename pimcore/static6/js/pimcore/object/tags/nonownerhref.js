/**
 * Pimcore
 *
 * This source file is subject to the GNU General Public License version 3 (GPLv3)
 * For the full copyright and license information, please view the LICENSE.md and gpl-3.0.txt
 * files that are distributed with this source code.
 *
 * @copyright  Copyright (c) 2009-2016 pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GNU General Public License version 3 (GPLv3)
 */

pimcore.registerNS("pimcore.object.tags.nonownerhref");
pimcore.object.tags.nonownerhref = Class.create(pimcore.object.tags.abstract, {

    type: "nonownerhref",
    dataChanged:false,

    initialize: function (data, fieldConfig) {
        this.data = {};

        if (data) {
            this.data = data;
        }
        this.fieldConfig = fieldConfig;
        
        this.store = new Ext.data.ArrayStore({
            data: this.data,
            listeners: {
                add:function() {
                    this.dataChanged = true;
                }.bind(this),
                remove: function() {
                    this.dataChanged = true;
                }.bind(this),
                clear: function () {
                    this.dataChanged = true;
                }.bind(this)
            },
            fields: [
                "id",
                "path",
                "type",
                "ownerclass",
                "fieldtype"
            ]
        });
    },

    getLayoutEdit: function () {

        var autoHeight = false;
        if (intval(this.fieldConfig.height) < 15) {
            autoHeight = true;
        }

        var cls = 'object_field';

        var classStore = pimcore.globalmanager.get("object_types_store");
        var record = classStore.getAt(classStore.find('text', this.fieldConfig.ownerClassName));

        // no class for nonowner is specified
        if(!record) {
            this.component = new Ext.Panel({
                title: ts(this.fieldConfig.title),
                cls: cls,
                html: "There's no class specified in the field-configuration"
            });

            return this.component;
        }


        var className = record.data.text;

	    this.component = Ext.create('Ext.grid.Panel', {
	        store: this.store,
	        style: "margin-bottom: 10px",
	        selModel: Ext.create('Ext.selection.RowModel', {}),
	
	            columns: [
	                {header: 'ID', dataIndex: 'id', flex: 50},
	                {header: t("path"), dataIndex: 'path', flex: 200},
	                {header: t("owner_class"), dataIndex: 'ownerclass', flex: 80},
	                //{header: t("type"), dataIndex: 'type', flex: 80},
	                {header: t("fieldtype"), dataIndex: 'fieldtype', flex: 80},
	                {
	                    xtype: 'actioncolumn',
	                    width: 30,
	                    items: [
	                        {
	                            tooltip: t('open'),
	                            icon: "/pimcore/static6/img/flat-color-icons/cursor.svg",
	                            handler: function (grid, rowIndex) {
	                                var data = grid.getStore().getAt(rowIndex);
	                                pimcore.helpers.openObject(data.data.id, "object");
	                            }.bind(this)
	                        }
	                    ]
	                },
	                {
	                    xtype: 'actioncolumn',
	                    width: 30,
	                    items: [
	                        {
	                            tooltip: t('remove'),
	                            icon: "/pimcore/static6/img/flat-color-icons/delete.svg",
	                            handler: this.actionColumnRemove.bind(this)
	                        }
	                    ]
	                }
	            ],
	
	        componentCls: cls,
	        autoExpandColumn: 'path',
	        width: this.fieldConfig.width,
	        height: this.fieldConfig.height,
	        tbar: {
	            items: [
	                {
	                    xtype: "tbspacer",
	                    width: 20,
	                    height: 16,
	                    cls: "pimcore_icon_droptarget"
	                },
	                {
	                    xtype: "tbtext",
	                    text: "<b>" + this.fieldConfig.title + "</b>"
	                },
	                "->",
	                {
	                    xtype: "button",
	                    iconCls: "pimcore_icon_delete",
	                    handler: this.empty.bind(this)
	                },
	                //{
	                   // xtype: "button",
	                    //iconCls: "pimcore_icon_search",
	                    //handler: this.openSearchEditor.bind(this)
	                //}
	                //,
	                //this.getCreateControl()
	            ],
	            ctCls: "pimcore_force_auto_width",
	            cls: "pimcore_force_auto_width"
	        },
	        bodyCssClass: "pimcore_object_tag_objects",
            bbar: {
                items: [{
                    xtype: "tbtext",
                    text: ' <span class="warning">' + t('nonownerobject_warning') + " | " + t('owner_class')
                                    + ':<b>' + ts(className) + "</b> " + t('owner_field') + ': <b>'
                                    + ts(this.fieldConfig.ownerFieldName) + '</b></span>'
                }],
                ctCls: "pimcore_force_auto_width",
                cls: "pimcore_force_auto_width"
            }
	    });

        this.component.on("rowcontextmenu", this.onRowContextmenu);
        this.component.reference = this;
        
        return this.component;
       
    },
    
    actionColumnRemove: function (grid, rowIndex) {
        var f = this.removeObject.bind(grid, rowIndex, null);
        f();
    },
    
    removeObject: function (index, item) {

        if (pimcore.globalmanager.exists("object_" + this.getStore().getAt(index).data.id) == false) {

            Ext.Ajax.request({
                url: "/admin/object/get/",
                params: {id: this.getStore().getAt(index).data.id},
                success: function(item, index, response) {
                    this.data = Ext.decode(response.responseText);
                    if (this.data.editlock) {
                        var lockDate = new Date(this.data.editlock.date * 1000);
                        var lockDetails = "<br /><br />";
                        lockDetails += "<b>" + t("user") + ":</b> " + this.data.editlock.user.name + "<br />";
                        lockDetails += "<b>" + t("since") + ": </b>" + Ext.util.Format.date(lockDate);
                        lockDetails += "<br /><br />" + t("element_implicit_edit_question");

                        Ext.MessageBox.confirm(t("element_is_locked"), t("element_lock_message") + lockDetails,
	                        function (lock, buttonValue) {
	                            if (buttonValue == "yes") {
	                                this.getStore().removeAt(index);
	                                if (item != null) {
	                                    item.parentMenu.destroy();
	                                }
	
	                            }
	                        }.bind(this, arguments));

                    } else {
                        Ext.Ajax.request({
                            url: "/admin/element/lock-element",
                            params: {id: this.getStore().getAt(index).data.id, type: 'object'}
                        });
                        this.getStore().removeAt(index);
                        if (item != null) {
                            item.parentMenu.destroy();
                        }
                    }

                }.bind(this, item, index)
            });
        } else {

            var lockDetails = "<br /><br />" + t("element_implicit_edit_question");

            Ext.MessageBox.confirm(t("element_is_open"), t("element_open_message") + lockDetails,
                    function (lock, buttonValue) {
                        if (buttonValue == "yes") {
                            this.getStore().removeAt(index);
                            item.parentMenu.destroy();
                        }
                    }.bind(this, arguments));
        }

    },
    
    empty: function () {
        this.store.removeAll();
    },
    
    onRowContextmenu: function (grid, record, tr, rowIndex, e, eOpts ) {

        var menu = new Ext.menu.Menu();
        var data = grid.getStore().getAt(rowIndex);

        menu.add(new Ext.menu.Item({
            text: t('remove'),
            iconCls: "pimcore_icon_delete",
            handler: this.reference.removeObject.bind(this, rowIndex)
        }));

        menu.add(new Ext.menu.Item({
            text: t('open'),
            iconCls: "pimcore_icon_open",
            handler: function (data, item) {
                item.parentMenu.destroy();
                pimcore.helpers.openObject(data.data.id, "object");
            }.bind(this, data)
        }));

        /*menu.add(new Ext.menu.Item({
            text: t('search'),
            iconCls: "pimcore_icon_search",
            handler: function (item) {
                item.parentMenu.destroy();
                this.openSearchEditor();
            }.bind(this.reference)
        }));*/

        e.stopEvent();
        menu.showAt(e.getXY());
    },
    
    getValue: function () {

        var tmData = [];

        var data = this.store.queryBy(function(record, id) {
            return true;
        });


        for (var i = 0; i < data.items.length; i++) {
            tmData.push(data.items[i].data);
        }
        return tmData;
    },

    getName: function () {
        return this.fieldConfig.name;
    },

    isDirty: function() {
        if(!this.isRendered()) {
            return false;
        }
        
        return this.dataChanged;
    }
    

});
